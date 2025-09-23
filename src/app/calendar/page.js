'use client'

import Navigation from '@/components/Navigation'
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar'
import { staticMonth as month, WEEKDAYS as weekdays, staticHeader as header } from '@/lib/staticCalendarSep2025'

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MonthlyCalendar header={header} weekdays={weekdays} month={month} />
      </main>
    </div>
  )
}
