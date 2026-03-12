import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, CheckCircle, Heart, XCircle, AlertTriangle } from 'lucide-react'
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

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
      setConfirmedDate(data.confirmed_date || data.proposed_date)
      setConfirmedTime(data.confirmed_time || data.proposed_time)
      const selected = (data.places ?? []).filter((p: Place) => p.is_selected).map((p: Place) => p.id)
      setSelectedPlaces(new Set(selected))
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
      status: 'confirmed', confirmed_date: confirmedDate, confirmed_time: confirmedTime,
    }).eq('id', dateInvite.id)
    for (const placeId of selectedPlaces) {
      await supabase.from('places').update({ is_selected: true }).eq('id', placeId)
    }
    navigate('/')
  }

  const handleCancel = async () => {
    if (!dateInvite || !user) return
    setSubmitting(true)
    await supabase.from('date_invites').update({ status: 'cancelled' }).eq('id', dateInvite.id)
    navigate('/')
  }

  const handleComplete = async () => {
    if (!dateInvite || !user) return
    setSubmitting(true)
    await supabase.from('date_invites').update({ status: 'completed' }).eq('id', dateInvite.id)
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-rose"><Heart className="w-8 h-8 animate-float" fill="currentColor" /></div>
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

  const isCreator = user?.id === dateInvite.creator_id
  const isPartner = user?.id === dateInvite.partner_id
  const otherName = isCreator ? (dateInvite.partner?.full_name ?? 'Partner') : (dateInvite.creator?.full_name ?? 'Partner')
  const canEdit = isPartner && dateInvite.status === 'pending'
  const isCancelled = dateInvite.status === 'cancelled'

  const statusBadgeClass = () => {
    switch (dateInvite.status) {
      case 'pending': return 'badge-pending'
      case 'confirmed': return 'badge-confirmed'
      case 'completed': return 'badge-completed'
      case 'cancelled': return 'badge-cancelled'
      default: return ''
    }
  }

  const statusLabel = () => {
    switch (dateInvite.status) {
      case 'pending': return 'Awaiting Response'
      case 'confirmed': return 'Confirmed'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return dateInvite.status
    }
  }

  return (
    <div className="min-h-screen heart-bg">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => navigate('/')} className={`p-2 rounded-xl transition mt-0.5 ${isDark ? 'text-gray-400 hover:text-white hover:bg-dark-hover' : 'text-slate-400 hover:text-slate-700 hover:bg-cream-hover'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>{dateInvite.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${statusBadgeClass()}`}>{statusLabel()}</span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>with {otherName}</span>
            </div>
          </div>
        </div>

        {/* Cancelled banner */}
        {isCancelled && (
          <div className={`flex items-center gap-3 rounded-2xl p-4 mb-4 ${isDark ? 'bg-gray-500/10 border border-gray-500/20' : 'bg-gray-100 border border-gray-200'}`}>
            <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>This date has been cancelled.</p>
          </div>
        )}

        {/* Personal Message */}
        {dateInvite.personal_message && (
          <div className={`${isDark ? 'card-dark' : 'card-light'} p-4 mb-4`}>
            <p className={`italic ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>"{dateInvite.personal_message}"</p>
          </div>
        )}

        {/* Date & Time */}
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4 ${isCancelled ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-rose" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Date & Time</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Date <span className="text-xs">(proposed: {new Date(dateInvite.proposed_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</span>
              </label>
              <input type="date" value={confirmedDate} onChange={(e) => setConfirmedDate(e.target.value)} disabled={!canEdit} className="w-full input-base disabled:opacity-60" />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Time <span className="text-xs">(proposed: {dateInvite.proposed_time})</span>
              </label>
              <input type="time" value={confirmedTime} onChange={(e) => setConfirmedTime(e.target.value)} disabled={!canEdit} className="w-full input-base disabled:opacity-60" />
            </div>
          </div>
        </div>

        {/* Places */}
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-6 ${isCancelled ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-rose" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {canEdit ? 'Choose your favorite places' : 'Places'}
            </h2>
            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>({selectedPlaces.size} selected)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {places.map(place => {
              const isSelected = selectedPlaces.has(place.id) || place.is_selected
              return (
                <button key={place.id} type="button" onClick={() => canEdit && togglePlace(place.id)}
                  className={`relative text-left rounded-2xl overflow-hidden transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-rose shadow-glow scale-[1.02]' : ''
                  } ${isDark
                    ? `bg-dark-input border ${isSelected ? 'border-rose' : 'border-dark-border hover:border-rose/50'}`
                    : `bg-white border ${isSelected ? 'border-rose' : 'border-cream-border hover:border-rose/50'} shadow-soft`
                  } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
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
                    {place.location && <p className={`text-xs flex items-center gap-1 mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}><MapPin className="w-3 h-3" />{place.location}</p>}
                    {place.description && <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{place.description}</p>}
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

        {/* Action Buttons */}
        <div className="space-y-3">
          {canEdit && (
            <button onClick={handleConfirm} disabled={submitting} className="w-full btn-primary !py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-5 h-5" />
              {submitting ? 'Confirming...' : 'Confirm Date'}
            </button>
          )}

          {dateInvite.status === 'confirmed' && (isCreator || isPartner) && (
            <button onClick={handleComplete} disabled={submitting}
              className="w-full font-bold rounded-2xl py-4 text-white flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
            >
              <CheckCircle className="w-5 h-5" />
              {submitting ? 'Completing...' : 'Mark as Completed'}
            </button>
          )}

          {(dateInvite.status === 'pending' || dateInvite.status === 'confirmed') && (isCreator || isPartner) && (
            <>
              {!showCancelConfirm ? (
                <button onClick={() => setShowCancelConfirm(true)}
                  className={`w-full flex items-center justify-center gap-2 font-semibold rounded-2xl py-4 transition-all duration-200 border-2 ${
                    isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-500 hover:bg-red-50'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  Cancel Date
                </button>
              ) : (
                <div className={`rounded-2xl p-4 border-2 ${isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <p className={`font-bold text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>Are you sure?</p>
                  </div>
                  <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    This will cancel the date for both you and {otherName}. This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleCancel} disabled={submitting}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl py-2.5 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      {submitting ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                    <button onClick={() => setShowCancelConfirm(false)}
                      className={`flex-1 font-semibold rounded-xl py-2.5 transition ${isDark ? 'bg-dark-hover text-gray-300 hover:bg-dark-input' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      Keep Date
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
