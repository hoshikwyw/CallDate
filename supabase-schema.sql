-- ============================================
-- CallDate Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profiles table (auto-created on signup)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Friendships table
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "Users can view own friendships" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can create friend requests" on public.friendships
  for insert with check (auth.uid() = requester_id);

create policy "Addressee can update friendship" on public.friendships
  for update using (auth.uid() = addressee_id);

-- 3. Date Invites table
create table public.date_invites (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  partner_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  personal_message text,
  proposed_date date not null,
  proposed_time text not null,
  confirmed_date date,
  confirmed_time text,
  status text check (status in ('pending', 'confirmed', 'completed', 'cancelled')) default 'pending',
  created_at timestamptz default now()
);

alter table public.date_invites enable row level security;

create policy "Users can view own dates" on public.date_invites
  for select using (auth.uid() = creator_id or auth.uid() = partner_id);

create policy "Users can create date invites" on public.date_invites
  for insert with check (auth.uid() = creator_id);

create policy "Involved users can update dates" on public.date_invites
  for update using (auth.uid() = creator_id or auth.uid() = partner_id);

-- 4. Places table
create table public.places (
  id uuid default gen_random_uuid() primary key,
  date_invite_id uuid references public.date_invites(id) on delete cascade not null,
  name text not null,
  location text,
  description text,
  photo_url text,
  is_selected boolean default false,
  created_at timestamptz default now()
);

alter table public.places enable row level security;

create policy "Users can view places for their dates" on public.places
  for select using (
    exists (
      select 1 from public.date_invites
      where date_invites.id = places.date_invite_id
      and (date_invites.creator_id = auth.uid() or date_invites.partner_id = auth.uid())
    )
  );

create policy "Users can create places for their dates" on public.places
  for insert with check (
    exists (
      select 1 from public.date_invites
      where date_invites.id = date_invite_id
      and date_invites.creator_id = auth.uid()
    )
  );

create policy "Involved users can update places" on public.places
  for update using (
    exists (
      select 1 from public.date_invites
      where date_invites.id = places.date_invite_id
      and (date_invites.creator_id = auth.uid() or date_invites.partner_id = auth.uid())
    )
  );

-- 5. Friendship Goals table
create table public.friendship_goals (
  id uuid default gen_random_uuid() primary key,
  friendship_id uuid references public.friendships(id) on delete cascade unique not null,
  completed_dates integer default 0,
  current_level integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.friendship_goals enable row level security;

create policy "Users can view own friendship goals" on public.friendship_goals
  for select using (
    exists (
      select 1 from public.friendships
      where friendships.id = friendship_goals.friendship_id
      and (friendships.requester_id = auth.uid() or friendships.addressee_id = auth.uid())
    )
  );

create policy "Users can update own friendship goals" on public.friendship_goals
  for update using (
    exists (
      select 1 from public.friendships
      where friendships.id = friendship_goals.friendship_id
      and (friendships.requester_id = auth.uid() or friendships.addressee_id = auth.uid())
    )
  );

-- Auto-create friendship goal when friendship is accepted
create or replace function public.handle_friendship_accepted()
returns trigger as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friendship_goals (friendship_id)
    values (new.id)
    on conflict (friendship_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_friendship_accepted
  after update on public.friendships
  for each row execute procedure public.handle_friendship_accepted();
