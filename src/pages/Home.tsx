import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Plus, Users, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import Calendar from '../components/Calendar'
import DateCard from '../components/DateCard'
import ThemeToggle from '../components/ThemeToggle'
import type { DateInvite } from '../types/database'

export default function Home() {
  const { user, signOut } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [dates, setDates] = useState<DateInvite[]>([])
  const [loading, setLoading] = useState(true)
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

  const getPartnerName = (dateInvite: DateInvite) => {
    if (dateInvite.creator_id === user?.id) return dateInvite.partner?.full_name ?? 'Partner'
    return dateInvite.creator?.full_name ?? 'Partner'
  }

  return (
    <div className="min-h-screen heart-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-love-gradient flex items-center justify-center shadow-glow">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>Date Planner</h1>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Plan perfect dates with your partner</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => navigate('/friends')} className="btn-secondary flex items-center gap-2">
            <Users className="w-4 h-4" />
            Friends
          </button>
          <button onClick={() => navigate('/create')} className="btn-primary flex items-center gap-2 !py-2.5">
            <Plus className="w-4 h-4" />
            New Date
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

      {/* Main Content */}
      <main className="flex gap-6 px-6 pb-6">
        <div className="flex-1">
          <Calendar dates={dates} />
        </div>

        <div className="w-96">
          <div className={`${isDark ? 'card-dark' : 'card-light'} p-4`}>
            <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Your Dates</h2>

            {loading ? (
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Loading...</p>
            ) : dates.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-muted mb-3">
                  <Heart className="w-7 h-7 text-rose opacity-50" />
                </div>
                <p className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>No dates yet</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>Create your first date invite!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dates.map(d => (
                  <DateCard
                    key={d.id}
                    dateInvite={d}
                    partnerName={getPartnerName(d)}
                    onClick={() => navigate(`/date/${d.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
