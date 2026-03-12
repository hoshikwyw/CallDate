import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, MapPin, Plus, X, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

interface PlaceForm {
  name: string
  location: string
  description: string
  photo: File | null
  photoPreview: string | null
}

export default function CreateDate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [places, setPlaces] = useState<PlaceForm[]>([])
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [newPlace, setNewPlace] = useState<PlaceForm>({ name: '', location: '', description: '', photo: null, photoPreview: null })
  const [friends, setFriends] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) fetchFriends()
  }, [user])

  const fetchFriends = async () => {
    if (!user) return
    const { data } = await supabase
      .from('friendships')
      .select(`
        requester:profiles!friendships_requester_id_fkey (*),
        addressee:profiles!friendships_addressee_id_fkey (*)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (data) {
      const friendProfiles = data.map(f => f.requester.id === user.id ? f.addressee : f.requester)
      setFriends(friendProfiles)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewPlace(prev => ({ ...prev, photo: file, photoPreview: URL.createObjectURL(file) }))
    }
  }

  const addPlace = () => {
    if (!newPlace.name.trim()) return
    setPlaces(prev => [...prev, { ...newPlace }])
    setNewPlace({ name: '', location: '', description: '', photo: null, photoPreview: null })
    setShowAddPlace(false)
  }

  const removePlace = (index: number) => setPlaces(prev => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (places.length === 0) { setError('Add at least one place'); return }
    if (!partnerId) { setError('Select a partner'); return }

    setLoading(true)
    setError('')

    const { data: dateInvite, error: dateError } = await supabase
      .from('date_invites')
      .insert({
        creator_id: user.id,
        partner_id: partnerId,
        title,
        personal_message: message || null,
        proposed_date: proposedDate,
        proposed_time: proposedTime,
        status: 'pending',
      })
      .select()
      .single()

    if (dateError || !dateInvite) {
      setError(dateError?.message ?? 'Failed to create date invite')
      setLoading(false)
      return
    }

    for (const place of places) {
      let photoUrl: string | null = null
      if (place.photo) {
        const fileExt = place.photo.name.split('.').pop()
        const filePath = `${dateInvite.id}/${crypto.randomUUID()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('place-photos').upload(filePath, place.photo)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('place-photos').getPublicUrl(filePath)
          photoUrl = urlData.publicUrl
        }
      }

      await supabase.from('places').insert({
        date_invite_id: dateInvite.id,
        name: place.name,
        location: place.location || null,
        description: place.description || null,
        photo_url: photoUrl,
      })
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 heart-bg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition ${isDark ? 'text-gray-400 hover:text-white hover:bg-dark-hover' : 'text-slate-400 hover:text-slate-700 hover:bg-cream-hover'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>Create Date Invite</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Plan something special</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-4">{error}</div>
        )}

        {/* Date Details Card */}
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-rose" fill="currentColor" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Date Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sunset Dinner Date" required className="w-full input-base" />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Personal Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write something sweet..." rows={3} className="w-full input-base resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Partner *</label>
                <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required className="w-full input-base">
                  <option value="">Select partner</option>
                  {friends.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                </select>
              </div>
              <div />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Proposed Date *</label>
                <input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} required className="w-full input-base" />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Proposed Time *</label>
                <input type="time" value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} required className="w-full input-base" />
              </div>
            </div>
          </div>
        </div>

        {/* Places Card */}
        <div className={`${isDark ? 'card-dark' : 'card-light'} p-5 mb-4`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose" />
              <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Places *</h2>
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>({places.length} added)</span>
            </div>
            {!showAddPlace && (
              <button type="button" onClick={() => setShowAddPlace(true)} className="btn-outline flex items-center gap-1 !text-xs !px-3 !py-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Place
              </button>
            )}
          </div>

          {/* Existing places with images */}
          {places.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {places.map((place, idx) => (
                <div key={idx} className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-input border border-dark-border' : 'bg-cream-input border border-cream-border'}`}>
                  {place.photoPreview && (
                    <img src={place.photoPreview} alt="" className="w-full h-24 object-cover" />
                  )}
                  <div className="p-3 flex items-start justify-between">
                    <div>
                      <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{place.name}</p>
                      {place.location && (
                        <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          <MapPin className="w-3 h-3" />{place.location}
                        </p>
                      )}
                      {place.description && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{place.description}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => removePlace(idx)} className="text-gray-500 hover:text-red-400 transition ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add place form */}
          {showAddPlace && (
            <div className={`rounded-xl p-4 border-2 border-dashed ${isDark ? 'border-rose/30 bg-rose/5' : 'border-rose/20 bg-rose-soft'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Add a Place</h3>
                <button type="button" onClick={() => setShowAddPlace(false)} className="text-gray-500 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Place Name *</label>
                    <input type="text" value={newPlace.name} onChange={(e) => setNewPlace(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rooftop Restaurant" className="w-full input-base !text-sm" />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Location</label>
                    <input type="text" value={newPlace.location} onChange={(e) => setNewPlace(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Downtown, 5th Ave" className="w-full input-base !text-sm" />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Description</label>
                  <textarea value={newPlace.description} onChange={(e) => setNewPlace(p => ({ ...p, description: e.target.value }))} placeholder="Why this place is special..." rows={2} className="w-full input-base !text-sm resize-none" />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Photo</label>
                  <label className={`flex flex-col items-center justify-center rounded-xl p-4 cursor-pointer border-2 border-dashed transition ${
                    isDark ? 'border-dark-border hover:border-rose bg-dark-input' : 'border-cream-border hover:border-rose bg-cream-input'
                  }`}>
                    {newPlace.photoPreview ? (
                      <img src={newPlace.photoPreview} alt="" className="w-full h-32 object-cover rounded-lg" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-rose mb-1" />
                        <span className="text-rose text-xs font-semibold">Click to upload</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                </div>

                <button type="button" onClick={addPlace} className="w-full btn-primary flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add Place
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {places.length === 0 && !showAddPlace && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-muted mb-3">
                <MapPin className="w-6 h-6 text-rose opacity-50" />
              </div>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Add places for your date</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>Your partner will choose from these</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="w-full btn-primary !py-4 flex items-center justify-center gap-2 disabled:opacity-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          {loading ? 'Sending...' : 'Send Date Invite'}
        </button>
      </form>
    </div>
  )
}
