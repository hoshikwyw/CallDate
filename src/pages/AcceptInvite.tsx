import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, CheckCircle, Heart, XCircle, AlertTriangle, Camera, BookHeart, ImagePlus, Trash2, Download, Users, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import type { DateInvite, Place, DateMemory, DateInviteMember } from '../types/database'

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
  const [cancelReason, setCancelReason] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [memory, setMemory] = useState<DateMemory | null>(null)
  const [memoText, setMemoText] = useState('')
  const [memoPhotos, setMemoPhotos] = useState<string[]>([])
  const [savingMemory, setSavingMemory] = useState(false)
  const [uploadingMemoryPhoto, setUploadingMemoryPhoto] = useState(false)
  const [memoryMessage, setMemoryMessage] = useState('')
  const [members, setMembers] = useState<DateInviteMember[]>([])

  useEffect(() => {
    if (id) fetchInvite()
  }, [id])

  useEffect(() => {
    if (dateInvite?.status === 'completed' && id) fetchMemory()
  }, [dateInvite?.status, id])

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

      // Fetch members separately to avoid circular RLS issues
      if (data.is_group) {
        const { data: membersData } = await supabase
          .from('date_invite_members')
          .select('*, profile:profiles!date_invite_members_user_id_profiles_fkey (*)')
          .eq('date_invite_id', id)
        setMembers((membersData ?? []) as DateInviteMember[])
      }
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
    await supabase.from('date_invites').update({ status: 'cancelled', cancel_reason: cancelReason.trim() || null }).eq('id', dateInvite.id)
    navigate('/')
  }

  const handleComplete = async () => {
    if (!dateInvite || !user) return
    setSubmitting(true)
    await supabase.from('date_invites').update({ status: 'completed' }).eq('id', dateInvite.id)
    navigate('/')
  }

  const handleDelete = async () => {
    if (!dateInvite || !user) return
    setSubmitting(true)
    await supabase.from('date_invites').delete().eq('id', dateInvite.id)
    navigate('/')
  }

  const fetchMemory = async () => {
    const { data } = await supabase
      .from('date_memories')
      .select('*')
      .eq('date_invite_id', id)
      .maybeSingle()

    if (data) {
      setMemory(data)
      setMemoText(data.memo ?? '')
      setMemoPhotos(data.photo_urls ?? [])
    }
  }

  const handleMemoryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !id || memoPhotos.length >= 3) return
    setUploadingMemoryPhoto(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `memories/${id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('place-photos')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data } = supabase.storage.from('place-photos').getPublicUrl(filePath)
      setMemoPhotos(prev => [...prev, data.publicUrl])
    }
    setUploadingMemoryPhoto(false)
  }

  const removeMemoryPhoto = (index: number) => {
    setMemoPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const saveMemory = async () => {
    if (!user || !id) return
    setSavingMemory(true)
    setMemoryMessage('')

    const memoryData = {
      date_invite_id: id,
      user_id: user.id,
      memo: memoText.trim() || null,
      photo_urls: memoPhotos,
      updated_at: new Date().toISOString(),
    }

    if (memory) {
      const { error } = await supabase.from('date_memories').update({
        memo: memoryData.memo,
        photo_urls: memoryData.photo_urls,
        updated_at: memoryData.updated_at,
      }).eq('id', memory.id)
      if (error) setMemoryMessage('Failed to save')
      else { setMemoryMessage('Memory saved!'); fetchMemory() }
    } else {
      const { error } = await supabase.from('date_memories').insert(memoryData)
      if (error) setMemoryMessage('Failed to save')
      else { setMemoryMessage('Memory saved!'); fetchMemory() }
    }
    setSavingMemory(false)
    setTimeout(() => setMemoryMessage(''), 3000)
  }

  const wordCount = memoText.trim().split(/\s+/).filter(Boolean).length

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
  const isMember = members.some(m => m.user_id === user?.id)
  const isGroupDate = dateInvite.is_group
  const otherName = isGroupDate
    ? `${members.length} friends`
    : isCreator ? (dateInvite.partner?.full_name ?? 'Partner') : (dateInvite.creator?.full_name ?? 'Partner')
  const canEdit = (isPartner || isMember) && dateInvite.status === 'pending'
  const isCancelled = dateInvite.status === 'cancelled'
  const myMembership = members.find(m => m.user_id === user?.id)
  const allMembersAccepted = isGroupDate && members.length > 0 && members.every(m => m.status === 'accepted')

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
              {isGroupDate && <span className="badge badge-confirmed flex items-center gap-1"><Users className="w-3 h-3" /> Group</span>}
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>with {otherName}</span>
            </div>
          </div>
        </div>

        {/* Cancelled banner */}
        {isCancelled && (
          <div className={`rounded-2xl p-4 mb-4 ${isDark ? 'bg-gray-500/10 border border-gray-500/20' : 'bg-gray-100 border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>This date has been cancelled.</p>
            </div>
            {dateInvite.cancel_reason && (
              <p className={`text-sm mt-2 ml-8 italic ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                Reason: "{dateInvite.cancel_reason}"
              </p>
            )}
          </div>
        )}

        {/* Personal Message */}
        {dateInvite.personal_message && (
          <div className={`${isDark ? 'card-dark' : 'card-light'} p-4 mb-4`}>
            <p className={`italic ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>"{dateInvite.personal_message}"</p>
          </div>
        )}

        {/* Group Members */}
        {isGroupDate && members.length > 0 && (
          <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-rose" />
              <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Members</h2>
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>({members.length})</span>
            </div>
            {/* Creator */}
            <div className={`flex items-center gap-3 py-2 px-3 rounded-xl mb-1 ${isDark ? 'bg-dark-input' : 'bg-cream-input'}`}>
              <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 ${!dateInvite.creator?.avatar_url ? 'bg-love-gradient flex items-center justify-center' : ''}`}>
                {dateInvite.creator?.avatar_url ? (
                  <img src={dateInvite.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <span className={`text-sm font-medium flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{dateInvite.creator?.full_name}</span>
              <span className="text-xs font-semibold text-rose">Organizer</span>
            </div>
            {/* Members */}
            {members.map(m => (
              <div key={m.id} className={`flex items-center gap-3 py-2 px-3 rounded-xl mb-1 ${isDark ? 'bg-dark-input' : 'bg-cream-input'}`}>
                <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 ${!m.profile?.avatar_url ? 'bg-love-gradient flex items-center justify-center' : ''}`}>
                  {m.profile?.avatar_url ? (
                    <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className={`text-sm font-medium flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{m.profile?.full_name}</span>
                <span className={`text-xs font-semibold ${
                  m.status === 'accepted' ? 'text-emerald-400' : m.status === 'declined' ? 'text-red-400' : isDark ? 'text-gray-500' : 'text-slate-400'
                }`}>
                  {m.status === 'accepted' ? 'Accepted' : m.status === 'declined' ? 'Declined' : 'Pending'}
                </span>
              </div>
            ))}
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

        {/* Memory Section - only for completed dates */}
        {dateInvite.status === 'completed' && (
          <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-6`}>
            <div className="flex items-center gap-2 mb-4">
              <BookHeart className="w-5 h-5 text-rose" />
              <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Date Memory</h2>
            </div>

            {/* Memory Photos */}
            <div className="mb-4">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                Photos <span className={`font-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>({memoPhotos.length}/3)</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {memoPhotos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <a
                        href={url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                      </a>
                      <button
                        onClick={() => removeMemoryPhoto(i)}
                        className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
                {memoPhotos.length < 3 && (
                  <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
                    isDark ? 'border-dark-border hover:border-rose/50 text-gray-500' : 'border-cream-border hover:border-rose/50 text-slate-400'
                  }`}>
                    {uploadingMemoryPhoto ? (
                      <div className="w-5 h-5 border-2 border-rose border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-semibold">Add Photo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleMemoryPhotoUpload} className="hidden" disabled={uploadingMemoryPhoto} />
                  </label>
                )}
              </div>
            </div>

            {/* Memo Text */}
            <div className="mb-4">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                Leave a Memo <span className={`font-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>(optional, max 500 words)</span>
              </label>
              <textarea
                value={memoText}
                onChange={(e) => {
                  const words = e.target.value.trim().split(/\s+/).filter(Boolean).length
                  if (words <= 500 || e.target.value.length < memoText.length) {
                    setMemoText(e.target.value)
                  }
                }}
                placeholder="Write about your date experience..."
                rows={5}
                className="w-full input-base resize-none"
              />
              <p className={`text-xs mt-1 text-right ${wordCount > 450 ? 'text-amber-400' : isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                {wordCount}/500 words
              </p>
            </div>

            {memoryMessage && (
              <p className={`text-sm mb-3 font-semibold ${memoryMessage.includes('saved') ? 'text-emerald-400' : 'text-red-400'}`}>
                {memoryMessage}
              </p>
            )}

            <button
              onClick={saveMemory}
              disabled={savingMemory || (memoPhotos.length === 0 && !memoText.trim())}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {savingMemory ? 'Saving...' : memory ? 'Update Memory' : 'Save Memory'}
            </button>
          </div>
        )}

        {/* Accept/Decline for group members */}
        {isGroupDate && isMember && myMembership?.status === 'pending' && dateInvite.status === 'pending' && (
          <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
            <p className={`text-sm mb-3 font-semibold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              {dateInvite.creator?.full_name} invited you to this group date!
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!myMembership) return
                  await supabase.from('date_invite_members').update({ status: 'accepted' }).eq('id', myMembership.id)
                  fetchInvite()
                }}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Accept
              </button>
              <button
                onClick={async () => {
                  if (!myMembership) return
                  await supabase.from('date_invite_members').update({ status: 'declined' }).eq('id', myMembership.id)
                  fetchInvite()
                }}
                className={`flex-1 font-semibold rounded-2xl py-3 transition border-2 ${
                  isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-500 hover:bg-red-50'
                }`}
              >
                <span className="flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Decline</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Single date: partner confirms */}
          {canEdit && !isGroupDate && (
            <button onClick={handleConfirm} disabled={submitting} className="w-full btn-primary !py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-5 h-5" />
              {submitting ? 'Confirming...' : 'Confirm Date'}
            </button>
          )}

          {/* Group date: creator confirms once all members accepted */}
          {isGroupDate && isCreator && allMembersAccepted && dateInvite.status === 'pending' && (
            <button onClick={handleConfirm} disabled={submitting} className="w-full btn-primary !py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-5 h-5" />
              {submitting ? 'Confirming...' : 'Confirm Group Date'}
            </button>
          )}

          {dateInvite.status === 'confirmed' && (isCreator || isPartner || isMember) && (
            <button onClick={handleComplete} disabled={submitting}
              className="w-full font-bold rounded-2xl py-4 text-white flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
            >
              <CheckCircle className="w-5 h-5" />
              {submitting ? 'Completing...' : 'Mark as Completed'}
            </button>
          )}

          {(dateInvite.status === 'pending' || dateInvite.status === 'confirmed') && (isCreator || isPartner || isMember) && (
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
                  <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    This will cancel the date for both you and {otherName}. This action cannot be undone.
                  </p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancelling (optional)"
                    rows={2}
                    className="w-full input-base resize-none mb-3 text-sm"
                  />
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

          {/* Delete button for completed dates */}
          {(dateInvite.status === 'completed' || dateInvite.status === 'cancelled') && isCreator && (
            <>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className={`w-full flex items-center justify-center gap-2 font-semibold rounded-2xl py-4 transition-all duration-200 border-2 ${
                    isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Date
                </button>
              ) : (
                <div className={`rounded-2xl p-4 border-2 ${isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <p className={`font-bold text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>Delete this date?</p>
                  </div>
                  <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    This will permanently delete this date, all places, and any saved memories. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={submitting}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl py-2.5 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {submitting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)}
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
