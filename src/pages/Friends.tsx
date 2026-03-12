import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Check, X, Users, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import type { Friendship } from '../types/database'

export default function Friends() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([])
  const [pendingSent, setPendingSent] = useState<Friendship[]>([])
  const [searchEmail, setSearchEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) fetchFriendships()
  }, [user])

  const fetchFriendships = async () => {
    if (!user) return
    const { data } = await supabase
      .from('friendships')
      .select(`*, requester:profiles!friendships_requester_id_fkey (*), addressee:profiles!friendships_addressee_id_fkey (*)`)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (data) {
      setFriendships(data.filter(f => f.status === 'accepted'))
      setPendingReceived(data.filter(f => f.status === 'pending' && f.addressee_id === user.id))
      setPendingSent(data.filter(f => f.status === 'pending' && f.requester_id === user.id))
    }
    setLoading(false)
  }

  const sendRequest = async () => {
    if (!user || !searchEmail.trim()) return
    setSending(true)
    setMessage('')

    const { data: profile } = await supabase.from('profiles').select('id').eq('email', searchEmail.trim()).single()
    if (!profile) { setMessage('User not found'); setSending(false); return }
    if (profile.id === user.id) { setMessage("You can't add yourself"); setSending(false); return }

    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: profile.id, status: 'pending' })
    if (error) { setMessage(error.message.includes('duplicate') ? 'Request already sent' : error.message) }
    else { setMessage('Friend request sent!'); setSearchEmail(''); fetchFriendships() }
    setSending(false)
  }

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    await supabase.from('friendships').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', friendshipId)
    fetchFriendships()
  }

  const getFriendProfile = (friendship: Friendship) => {
    return friendship.requester?.id === user?.id ? friendship.addressee : friendship.requester
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 heart-bg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition ${isDark ? 'text-gray-400 hover:text-white hover:bg-dark-hover' : 'text-slate-400 hover:text-slate-700 hover:bg-cream-hover'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>Friends</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Manage your connections</p>
        </div>
      </div>

      {/* Add Friend */}
      <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-5 h-5 text-rose" />
          <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Add Friend</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Enter friend's email"
            className="flex-1 input-base"
          />
          <button onClick={sendRequest} disabled={sending} className="btn-primary !px-5 disabled:opacity-50">
            {sending ? '...' : 'Send'}
          </button>
        </div>
        {message && (
          <p className={`text-sm mt-2 font-semibold ${message.includes('sent') ? 'text-emerald-500' : 'text-red-400'}`}>{message}</p>
        )}
      </div>

      {/* Pending Received */}
      {pendingReceived.length > 0 && (
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
          <h2 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>Pending Requests</h2>
          <div className="space-y-3">
            {pendingReceived.map(f => (
              <div key={f.id} className={`flex items-center justify-between rounded-xl p-3 ${isDark ? 'bg-dark-input border border-dark-border' : 'bg-cream-input border border-cream-border'}`}>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{f.requester?.full_name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{f.requester?.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respondToRequest(f.id, true)} className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => respondToRequest(f.id, false)} className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Sent */}
      {pendingSent.length > 0 && (
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
          <h2 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>Sent Requests</h2>
          <div className="space-y-3">
            {pendingSent.map(f => (
              <div key={f.id} className={`flex items-center justify-between rounded-xl p-3 ${isDark ? 'bg-dark-input border border-dark-border' : 'bg-cream-input border border-cream-border'}`}>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{f.addressee?.full_name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{f.addressee?.email}</p>
                </div>
                <span className="badge badge-pending">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className={`${isDark ? 'card-dark' : 'card-light'} p-5`}>
        <h2 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>Your Friends</h2>
        {loading ? (
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Loading...</p>
        ) : friendships.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-muted mb-3">
              <Users className="w-7 h-7 text-rose opacity-50" />
            </div>
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>No friends yet</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>Add a friend by their email above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friendships.map(f => {
              const friend = getFriendProfile(f)
              return (
                <div key={f.id} className={`flex items-center gap-3 rounded-xl p-3 ${isDark ? 'bg-dark-input border border-dark-border' : 'bg-cream-input border border-cream-border'}`}>
                  <div className="w-10 h-10 rounded-full bg-love-gradient flex items-center justify-center text-white font-bold text-sm shadow-glow">
                    {friend?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{friend?.full_name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{friend?.email}</p>
                  </div>
                  <Heart className="w-4 h-4 text-rose" fill="currentColor" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
