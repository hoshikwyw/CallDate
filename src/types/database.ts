export type DateStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  requester?: Profile
  addressee?: Profile
}

export interface DateInvite {
  id: string
  creator_id: string
  partner_id: string
  title: string
  personal_message: string | null
  proposed_date: string
  proposed_time: string
  confirmed_date: string | null
  confirmed_time: string | null
  status: DateStatus
  created_at: string
  creator?: Profile
  partner?: Profile
  places?: Place[]
}

export interface Place {
  id: string
  date_invite_id: string
  name: string
  location: string | null
  description: string | null
  photo_url: string | null
  is_selected: boolean
  created_at: string
}

export interface FriendshipGoal {
  id: string
  friendship_id: string
  completed_dates: number
  current_level: number
  created_at: string
  updated_at: string
}
