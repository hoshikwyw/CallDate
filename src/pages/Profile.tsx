import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Camera, Save, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState({ totalDates: 0, completed: 0, friends: 0 })

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
      setAvatarUrl(profile.avatar_url)
    }
    if (user) fetchStats()
  }, [profile, user])

  const fetchStats = async () => {
    if (!user) return

    const [datesRes, friendsRes] = await Promise.all([
      supabase.from('date_invites')
        .select('id, status')
        .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`),
      supabase.from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ])

    const dates = datesRes.data ?? []
    setStats({
      totalDates: dates.length,
      completed: dates.filter(d => d.status === 'completed').length,
      friends: friendsRes.data?.length ?? 0,
    })
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `avatars/${user.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('place-photos')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data } = supabase.storage.from('place-photos').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)

      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
      await refreshProfile()
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!user || !fullName.trim()) return
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
    }).eq('id', user.id)

    if (error) {
      setMessage('Failed to update profile')
    } else {
      setMessage('Profile updated!')
      await refreshProfile()
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="min-h-screen heart-bg">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className={`p-2 rounded-xl transition ${isDark ? 'text-gray-400 hover:text-white hover:bg-dark-hover' : 'text-slate-400 hover:text-slate-700 hover:bg-cream-hover'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>My Profile</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Manage your information</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${isDark ? 'border-dark-border' : 'border-cream-border'} shadow-glow`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-love-gradient flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            <label className={`absolute inset-0 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
              isDark ? 'bg-black/50' : 'bg-black/40'
            }`}>
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Click to change photo</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Dates', value: stats.totalDates, color: 'text-rose' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Friends', value: stats.friends, color: 'text-lavender' },
          ].map(stat => (
            <div key={stat.label} className={`text-center p-4 rounded-2xl ${isDark ? 'card-dark' : 'card-light'}`}>
              <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Profile Form */}
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-rose" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Profile Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full input-base"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full input-base disabled:opacity-60"
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>Email cannot be changed</p>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Member Since</label>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>

          {message && (
            <p className={`text-sm mt-4 font-semibold ${message.includes('updated') ? 'text-emerald-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="w-full btn-primary mt-5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Love level teaser */}
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 text-center`}>
          <Heart className="w-8 h-8 text-rose mx-auto mb-2" fill="currentColor" />
          <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {stats.completed === 0 ? 'Start your journey!' : stats.completed < 5 ? 'Getting started!' : stats.completed < 10 ? 'Growing stronger!' : 'Love champions!'}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            {stats.completed} date{stats.completed !== 1 ? 's' : ''} completed — keep going!
          </p>
          <div className={`mt-3 w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-input' : 'bg-cream-input'}`}>
            <div
              className="h-full bg-love-gradient rounded-full transition-all duration-500"
              style={{ width: `${Math.min((stats.completed / 10) * 100, 100)}%` }}
            />
          </div>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
            {stats.completed}/10 to next level
          </p>
        </div>
      </div>
    </div>
  )
}
