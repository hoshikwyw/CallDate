import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, CheckCircle, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import type { DateInvite, Place } from '../types/database'

export default function AcceptInvite() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const [dateInvite, setDateInvite] = useState<DateInvite | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [confirmedDate, setConfirmedDate] = useState('')
  const [confirmedTime, setConfirmedTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) fetchInvite()
  }, [id])

  const fetchInvite = async () => {
    const { data } = await supabase
      .from('date_invites')
      .select(`*, creator:profiles!date_invites_creator_id_fkey (*), partner:profiles!date_invites_partner_id_fkey (*), places (*)`)
      .eq('id', id)
      .single()

    if (data) {
      setDateInvite(data)
      setPlaces(data.places ?? [])
      setConfirmedDate(data.proposed_date)
      setConfirmedTime(data.proposed_time)
    }
    setLoading(false)
  }

  const togglePlace = (placeId: string) => {
    setSelectedPlaces(prev => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }

  const handleConfirm = async () => {
    if (!dateInvite || !user) return
    setSubmitting(true)

    await supabase.from('date_invites').update({
      status: 'confirmed',
      confirmed_date: confirmedDate,
      confirmed_time: confirmedTime,
    }).eq('id', dateInvite.id)

    for (const placeId of selectedPlaces) {
      await supabase.from('places').update({ is_selected: true }).eq('id', placeId)
    }

    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-rose">
          <Heart className="w-8 h-8 animate-float" fill="currentColor" />
        </div>
      </div>
    )
  }

  if (!dateInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className={isDark ? 'text-gray-400' : 'text-slate-500'}>Invite not found</p>
      </div>
    )
  }

  const isPartner = user?.id === dateInvite.partner_id
  const creatorName = dateInvite.creator?.full_name ?? 'Someone'

  return (
    <div className="min-h-screen heart-bg">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition mt-0.5 ${isDark ? 'text-gray-400 hover:text-white hover:bg-dark-hover' : 'text-slate-400 hover:text-slate-700 hover:bg-cream-hover'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>{dateInvite.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${dateInvite.status === 'pending' ? 'badge-pending' : dateInvite.status === 'confirmed' ? 'badge-confirmed' : 'badge-completed'}`}>
                {dateInvite.status === 'pending' ? 'Awaiting Response' : dateInvite.status.charAt(0).toUpperCase() + dateInvite.status.slice(1)}
              </span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>with {creatorName}</span>
            </div>
          </div>
        </div>

        {/* Personal Message */}
        {dateInvite.personal_message && (
          <div className={`${isDark ? 'card-dark' : 'card-light'} p-4 mb-4`}>
            <p className={`italic ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>"{dateInvite.personal_message}"</p>
          </div>
        )}

        {/* Date & Time */}
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-rose" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Date & Time</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Date <span className="text-xs">(proposed: {new Date(dateInvite.proposed_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</span>
              </label>
              <input
                type="date"
                value={confirmedDate}
                onChange={(e) => setConfirmedDate(e.target.value)}
                disabled={!isPartner || dateInvite.status !== 'pending'}
                className="w-full input-base disabled:opacity-60"
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Time <span className="text-xs">(proposed: {dateInvite.proposed_time})</span>
              </label>
              <input
                type="time"
                value={confirmedTime}
                onChange={(e) => setConfirmedTime(e.target.value)}
                disabled={!isPartner || dateInvite.status !== 'pending'}
                className="w-full input-base disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Places with images */}
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-rose" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Choose your favorite places</h2>
            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>({selectedPlaces.size} selected)</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {places.map(place => {
              const isSelected = selectedPlaces.has(place.id)
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => isPartner && dateInvite.status === 'pending' && togglePlace(place.id)}
                  className={`relative text-left rounded-2xl overflow-hidden transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-rose shadow-glow scale-[1.02]'
                      : ''
                  } ${
                    isDark
                      ? `bg-dark-input border ${isSelected ? 'border-rose' : 'border-dark-border hover:border-rose/50'}`
                      : `bg-white border ${isSelected ? 'border-rose' : 'border-cream-border hover:border-rose/50'} shadow-soft`
                  } ${!isPartner || dateInvite.status !== 'pending' ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {place.photo_url && (
                    <div className="relative">
                      <img src={place.photo_url} alt={place.name} className="w-full h-32 object-cover" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{place.name}</p>
                    {place.location && (
                      <p className={`text-xs flex items-center gap-1 mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        <MapPin className="w-3 h-3" />{place.location}
                      </p>
                    )}
                    {place.description && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{place.description}</p>
                    )}
                  </div>
                  {isSelected && !place.photo_url && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Confirm Button */}
        {isPartner && dateInvite.status === 'pending' && (
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full btn-primary !py-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            {submitting ? 'Confirming...' : 'Confirm Date'}
          </button>
        )}
      </div>
    </div>
  )
}
