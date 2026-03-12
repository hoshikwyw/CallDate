import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Heart, Sparkles, Clock, MapPin, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import type { DateInvite } from '../types/database'

interface CalendarProps {
  dates: DateInvite[]
  onDateClick?: (date: Date) => void
  onDateNavigate?: (dateInvite: DateInvite) => void
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-400/15 text-amber-400 border-amber-400/20' },
  confirmed: { label: 'Confirmed', cls: 'bg-rose/15 text-rose border-rose/20' },
  completed: { label: 'Completed', cls: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-400/15 text-gray-400 border-gray-400/20' },
}

export default function Calendar({ dates, onDateClick, onDateNavigate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [previewDay, setPreviewDay] = useState<number | null>(null)
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number; alignRight: boolean }>({ x: 0, y: 0, alignRight: false })
  const calendarRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const getDatesForDay = useCallback((day: number): DateInvite[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dates.filter(d => (d.confirmed_date || d.proposed_date) === dateStr)
  }, [year, month, dates])

  const getDateStatus = (day: number) => {
    const matching = getDatesForDay(day)
    if (matching.length === 0) return null
    if (matching.some(d => d.status === 'pending')) return 'pending'
    if (matching.some(d => d.status === 'confirmed')) return 'confirmed'
    if (matching.some(d => d.status === 'completed')) return 'completed'
    return null
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setPreviewDay(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCellClick = (day: number, e: React.MouseEvent) => {
    const dayDates = getDatesForDay(day)
    if (dayDates.length > 0) {
      const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const calRect = calendarRef.current?.getBoundingClientRect()
      if (calRect) {
        const cellCenterX = cellRect.left - calRect.left + cellRect.width / 2

        setPreviewPos({
          x: cellCenterX,
          y: cellRect.bottom - calRect.top + 10,
          alignRight: cellCenterX > calRect.width / 2,
        })
      }
      setPreviewDay(previewDay === day ? null : day)
    } else {
      setPreviewDay(null)
      onDateClick?.(new Date(year, month, day))
    }
  }

  const prevMonth = () => { setCurrentMonth(new Date(year, month - 1)); setPreviewDay(null) }
  const nextMonth = () => { setCurrentMonth(new Date(year, month + 1)); setPreviewDay(null) }

  const monthStr = currentMonth.toLocaleString('default', { month: 'long' })
  const yearStr = currentMonth.getFullYear()

  const cells: { day: number; currentMonth: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, currentMonth: false })
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, currentMonth: true })
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, currentMonth: false })

  const statusStyles = (status: string | null) => {
    if (!status) return {}
    const styles: Record<string, { dot: string; ring: string; bg: string }> = {
      pending: { dot: 'bg-amber-400', ring: 'ring-amber-400/30', bg: isDark ? 'bg-amber-400/10' : 'bg-amber-50' },
      confirmed: { dot: 'bg-rose', ring: 'ring-rose/30', bg: isDark ? 'bg-rose/10' : 'bg-rose-soft' },
      completed: { dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', bg: isDark ? 'bg-emerald-400/10' : 'bg-emerald-50' },
    }
    return styles[status] || {}
  }

  const previewDates = previewDay !== null ? getDatesForDay(previewDay) : []

  // Calculate popup position - clamp within calendar bounds
  const popupStyle = (() => {
    const popupWidth = 280
    const calWidth = calendarRef.current?.offsetWidth || 600
    let left = previewPos.x - popupWidth / 2
    left = Math.max(8, Math.min(left, calWidth - popupWidth - 8))
    return { left: `${left}px`, top: `${previewPos.y}px`, width: `${popupWidth}px` }
  })()

  const arrowLeft = (() => {
    const popupWidth = 280
    const calWidth = calendarRef.current?.offsetWidth || 600
    let left = previewPos.x - popupWidth / 2
    left = Math.max(8, Math.min(left, calWidth - popupWidth - 8))
    return previewPos.x - left
  })()

  return (
    <div ref={calendarRef} className={`${isDark ? 'card-dark' : 'card-light'} overflow-visible relative`}>
      {/* Gradient Header */}
      <div className="bg-love-gradient px-4 sm:px-6 py-4 sm:py-5 rounded-t-2xl relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide">{monthStr}</h2>
            <p className="text-white/60 text-[11px] font-semibold">{yearStr}</p>
          </div>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
        <Sparkles className="absolute top-2 right-3 w-4 h-4 text-white/20" />
      </div>

      <div className="p-3 sm:p-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(day => (
            <div key={day} className={`text-center text-[11px] font-bold uppercase tracking-wider py-1 ${
              isDark ? 'text-gray-500' : 'text-rose/40'
            }`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - fixed size cells */}
        <div ref={gridRef} className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            const status = cell.currentMonth ? getDateStatus(cell.day) : null
            const todayCell = cell.currentMonth && isToday(cell.day)
            const sStyle = statusStyles(status) as { dot?: string; ring?: string; bg?: string }
            const hasDate = !!status
            const isActive = previewDay === cell.day && cell.currentMonth

            return (
              <button
                key={idx}
                onClick={(e) => cell.currentMonth && handleCellClick(cell.day, e)}
                className={`
                  relative flex flex-col items-center justify-center h-10 sm:h-11 rounded-xl
                  transition-all duration-200 group text-[13px]
                  ${!cell.currentMonth ? (isDark ? 'text-gray-700/40' : 'text-slate-300') : ''}
                  ${cell.currentMonth && !todayCell && !hasDate
                    ? isDark ? 'text-gray-300 hover:bg-dark-hover' : 'text-slate-600 hover:bg-cream-hover'
                    : ''}
                  ${todayCell && !hasDate ? 'bg-love-gradient text-white font-extrabold shadow-glow' : ''}
                  ${todayCell && hasDate ? 'bg-love-gradient text-white font-extrabold shadow-glow ring-2 ' + (sStyle.ring || '') : ''}
                  ${hasDate && !todayCell ? (sStyle.bg || '') + ' ring-1 ' + (sStyle.ring || '') + ' hover:scale-105 cursor-pointer' : ''}
                  ${isActive ? 'scale-105 !ring-2 z-10' : ''}
                `}
              >
                <span className={`leading-none ${
                  todayCell ? 'font-extrabold' : hasDate ? 'font-bold' : 'font-medium'
                } ${hasDate && !todayCell ? (isDark ? 'text-white' : 'text-slate-700') : ''}`}>
                  {cell.day}
                </span>

                {hasDate && (
                  <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${sStyle.dot} ${todayCell ? '!bg-white' : ''}`} />
                )}

                {hasDate && !todayCell && !isActive && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl">
                    <Heart className="w-3 h-3 text-rose" fill="currentColor" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Date Preview Popup - positioned correctly */}
        {previewDay !== null && previewDates.length > 0 && (
          <div
            className={`absolute z-50 rounded-2xl shadow-xl border backdrop-blur-sm ${
              isDark ? 'bg-dark-card/95 border-dark-border' : 'bg-white/95 border-cream-border'
            }`}
            style={popupStyle}
          >
            {/* Arrow */}
            <div
              className={`absolute -top-2 w-4 h-4 rotate-45 border-l border-t ${
                isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-cream-border'
              }`}
              style={{ left: `${arrowLeft}px`, transform: 'translateX(-50%) rotate(45deg)' }}
            />

            <div className="relative p-3">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {new Date(year, month, previewDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' '}&middot;{' '}
                  {previewDates.length} {previewDates.length === 1 ? 'date' : 'dates'}
                </p>
                <button
                  onClick={() => setPreviewDay(null)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                    isDark ? 'hover:bg-dark-hover text-gray-500' : 'hover:bg-cream-hover text-slate-400'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {previewDates.map(d => {
                  const badge = statusBadge[d.status] || statusBadge.pending
                  const placePhoto = d.places?.find(p => p.photo_url)?.photo_url
                  const placeCount = d.places?.length ?? 0

                  return (
                    <button
                      key={d.id}
                      onClick={() => { setPreviewDay(null); onDateNavigate?.(d) }}
                      className={`w-full text-left rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
                        isDark
                          ? 'bg-dark-input border border-dark-border hover:border-rose/40'
                          : 'bg-cream-input border border-cream-border hover:border-rose/40'
                      }`}
                    >
                      {placePhoto && (
                        <div className="relative h-20 overflow-hidden">
                          <img src={placePhoto} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <span className={`absolute bottom-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      )}
                      <div className="p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{d.title}</h4>
                          {!placePhoto && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>{badge.label}</span>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{d.confirmed_time || d.proposed_time}</span>
                          {placeCount > 0 && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{placeCount} {placeCount === 1 ? 'place' : 'places'}</span>}
                        </div>
                        <p className="text-[11px] font-semibold text-rose mt-1">
                          with {d.partner?.full_name || d.creator?.full_name || 'Partner'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className={`flex items-center justify-center gap-4 sm:gap-5 mt-4 pt-3 border-t ${isDark ? 'border-dark-border' : 'border-cream-border'}`}>
          {[
            { label: 'Pending', color: 'bg-amber-400' },
            { label: 'Confirmed', color: 'bg-rose' },
            { label: 'Completed', color: 'bg-emerald-400' },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
