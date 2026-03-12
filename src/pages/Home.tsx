import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Plus, Users, LogOut, CalendarHeart, X, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import Calendar from '../components/Calendar'
import DateCard from '../components/DateCard'
import ThemeToggle from '../components/ThemeToggle'
import type { DateInvite } from '../types/database'

export default function Home() {
  const { user, profile, signOut } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [dates, setDates] = useState<DateInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showDatesPanel, setShowDatesPanel] = useState(false)
  const isDark = theme === 'dark'

  useEffect(() => {
    if (user) fetchDates()
  }, [user])

  const fetchDates = async () => {
    if (!user) return
    const { data } = await supabase
      .from('date_invites')
      .select(`
        *,
        places (*),
        creator:profiles!date_invites_creator_id_fkey (*),
        partner:profiles!date_invites_partner_id_fkey (*)
      `)
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .order('proposed_date', { ascending: false })

    setDates(data ?? [])
    setLoading(false)
  }

  const getPartner = (dateInvite: DateInvite) => {
    const partner = dateInvite.creator_id === user?.id ? dateInvite.partner : dateInvite.creator
    return { name: partner?.full_name ?? 'Partner', avatar: partner?.avatar_url ?? null }
  }

  return (
    <div className="min-h-screen heart-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-love-gradient flex items-center justify-center shadow-glow">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className={`text-lg sm:text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>Date Planner</h1>
            <p className={`text-xs hidden sm:block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Plan perfect dates with your partner</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <button
            onClick={() => setShowDatesPanel(true)}
            className="btn-secondary flex items-center gap-2 relative"
          >
            <CalendarHeart className="w-4 h-4" />
            <span className="hidden sm:inline">My Dates</span>
            {(() => {
              const pending = dates.filter(d => d.status === 'pending').length
              return pending > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center">
                  {pending}
                </span>
              ) : null
            })()}
          </button>
          <button onClick={() => navigate('/friends')} className="btn-secondary flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Friends</span>
          </button>
          <button onClick={() => navigate('/create')} className="btn-primary flex items-center gap-2 !py-2.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Date</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className={`w-9 h-9 rounded-full overflow-hidden border-2 transition hover:scale-105 ${isDark ? 'border-dark-border hover:border-rose' : 'border-cream-border hover:border-rose'}`}
            title="Profile"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-love-gradient flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
          <button
            onClick={signOut}
            className={`p-2 rounded-xl transition ${isDark ? 'text-gray-400 hover:text-white hover:bg-dark-hover' : 'text-slate-400 hover:text-slate-700 hover:bg-cream-hover'}`}
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Calendar - full width, responsive */}
      <main className="px-4 sm:px-6 pb-6 max-w-4xl mx-auto">
        <Calendar dates={dates} onDateNavigate={(d) => navigate(`/date/${d.id}`)} />
      </main>

      {/* Dates Slide-out Panel */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          showDatesPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowDatesPanel(false)}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-96 transition-transform duration-300 ease-out ${
          showDatesPanel ? 'translate-x-0' : 'translate-x-full'
        } ${isDark ? 'bg-dark' : 'bg-cream'}`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <CalendarHeart className="w-5 h-5 text-rose" />
            <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>Your Dates</h2>
          </div>
          <button
            onClick={() => setShowDatesPanel(false)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              isDark ? 'hover:bg-dark-hover text-gray-400' : 'hover:bg-cream-hover text-slate-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">
          {loading ? (
            <p className={`text-sm text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Loading...</p>
          ) : dates.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-muted mb-4">
                <Heart className="w-8 h-8 text-rose opacity-40" />
              </div>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>No dates yet</p>
              <p className={`text-xs mt-1 mb-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>Create your first date invite!</p>
              <button
                onClick={() => { setShowDatesPanel(false); navigate('/create') }}
                className="btn-primary inline-flex items-center gap-2 !text-sm"
              >
                <Plus className="w-4 h-4" /> New Date
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dates.map(d => (
                <DateCard
                  key={d.id}
                  dateInvite={d}
                  partnerName={getPartner(d).name}
                  partnerAvatar={getPartner(d).avatar}
                  onClick={() => { setShowDatesPanel(false); navigate(`/date/${d.id}`) }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
