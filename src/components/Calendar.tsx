import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import type { DateInvite } from '../types/database'

interface CalendarProps {
  dates: DateInvite[]
  onDateClick?: (date: Date) => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar({ dates, onDateClick }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
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

  const getDateStatus = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const matchingDates = dates.filter(d => {
      const checkDate = d.confirmed_date || d.proposed_date
      return checkDate === dateStr
    })
    if (matchingDates.length === 0) return null
    if (matchingDates.some(d => d.status === 'pending')) return 'pending'
    if (matchingDates.some(d => d.status === 'confirmed')) return 'confirmed'
    if (matchingDates.some(d => d.status === 'completed')) return 'completed'
    return null
  }

  const statusDotColor = (status: string | null) => {
    switch (status) {
      case 'pending': return 'bg-status-pending'
      case 'confirmed': return 'bg-status-confirmed'
      case 'completed': return 'bg-status-completed'
      default: return ''
    }
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1))
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const cells: { day: number; currentMonth: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, currentMonth: false })
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, currentMonth: true })
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, currentMonth: false })

  return (
    <div className={`${isDark ? 'card-dark' : 'card-light'} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="text-rose hover:text-rose-light transition p-1 rounded-xl hover:bg-rose-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{monthName}</h2>
        <button onClick={nextMonth} className="text-rose hover:text-rose-light transition p-1 rounded-xl hover:bg-rose-muted">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(day => (
          <div key={day} className={`text-center text-xs font-semibold py-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{day}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const status = cell.currentMonth ? getDateStatus(cell.day) : null
          const todayHighlight = cell.currentMonth && isToday(cell.day)

          return (
            <button
              key={idx}
              onClick={() => cell.currentMonth && onDateClick?.(new Date(year, month, cell.day))}
              className={`
                relative flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-200
                ${!cell.currentMonth
                  ? isDark ? 'text-gray-700' : 'text-slate-300'
                  : isDark ? 'text-gray-300 hover:bg-dark-hover' : 'text-slate-600 hover:bg-cream-hover'}
                ${todayHighlight ? 'border-2 border-rose shadow-glow' : ''}
              `}
            >
              <span className={`text-sm ${todayHighlight ? 'text-rose font-extrabold' : ''}`}>
                {cell.day}
              </span>
              {status && (
                <span className={`absolute bottom-1 w-2 h-2 rounded-full ${statusDotColor(status)} shadow-sm`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-5 text-xs font-semibold">
        {[
          { label: 'Pending', color: 'bg-status-pending' },
          { label: 'Confirmed', color: 'bg-status-confirmed' },
          { label: 'Completed', color: 'bg-status-completed' },
        ].map(item => (
          <div key={item.label} className={`flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
