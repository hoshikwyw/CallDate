import { Calendar, Clock, MapPin, Image, User } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import type { DateInvite } from '../types/database'

interface DateCardProps {
  dateInvite: DateInvite
  partnerName: string
  partnerAvatar?: string | null
  onClick?: () => void
}

const statusConfig = {
  pending: { label: 'Pending', cls: 'badge-pending' },
  confirmed: { label: 'Confirmed', cls: 'badge-confirmed' },
  completed: { label: 'Completed', cls: 'badge-completed' },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
}

export default function DateCard({ dateInvite, partnerName, partnerAvatar, onClick }: DateCardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const status = statusConfig[dateInvite.status]
  const displayDate = dateInvite.confirmed_date || dateInvite.proposed_date
  const displayTime = dateInvite.confirmed_time || dateInvite.proposed_time
  const placeCount = dateInvite.places?.length ?? 0
  const firstPlacePhoto = dateInvite.places?.find(p => p.photo_url)?.photo_url

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.01] hover:shadow-cute ${
        isDark
          ? 'bg-dark-card border border-dark-border hover:bg-dark-hover'
          : 'bg-white border border-cream-border hover:bg-cream-hover shadow-soft'
      }`}
    >
      {/* Place image banner */}
      {firstPlacePhoto && (
        <div className="relative h-28 overflow-hidden">
          <img src={firstPlacePhoto} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{dateInvite.title}</h3>
          <span className={`badge ${status.cls}`}>{status.label}</span>
        </div>

        <div className={`flex items-center gap-3 text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(displayDate)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {displayTime}
          </span>
          <span className="flex items-center gap-1">
            {firstPlacePhoto ? <Image className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
            {placeCount} {placeCount === 1 ? 'place' : 'places'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
            {partnerAvatar ? (
              <img src={partnerAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-love-gradient flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <p className="text-sm font-semibold text-rose">with {partnerName}</p>
        </div>
      </div>
    </button>
  )
}
