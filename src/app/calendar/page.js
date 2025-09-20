'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockCalendarData } from '@/lib/mockData'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(mockCalendarData)

  const handlePreviousMonth = () => {
    // In a real app, this would fetch previous month's data
    console.log('Previous month')
  }

  const handleNextMonth = () => {
    // In a real app, this would fetch next month's data
    console.log('Next month')
  }

  const getFestivalColor = (festival) => {
    if (!festival) return ''
    return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Panchang Calendar</h1>
          <p className="text-lg text-gray-600">Monthly view with Panchang highlights</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <span>{currentMonth.month}</span>
              </CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Days of week header */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {currentMonth.days.map((day, index) => (
                <div
                  key={index}
                  className={`p-2 min-h-[80px] border rounded-lg ${
                    day.isToday 
                      ? 'bg-blue-100 border-blue-300' 
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col h-full">
                    <div className={`text-sm font-medium mb-1 ${
                      day.isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {day.date}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">{day.tithi}</div>
                    {day.festival && (
                      <div className={`text-xs px-1 py-0.5 rounded border ${getFestivalColor(day.festival)}`}>
                        {day.festival}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Festival</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Month's Festivals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                  <span className="text-sm font-medium">Navratri Begins</span>
                  <span className="text-xs text-gray-600">Sep 20</span>
                </div>
                {/* Add more festivals as needed */}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Important Tithis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="text-sm font-medium">Purnima</span>
                  <span className="text-xs text-gray-600">Sep 1, 27</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-sm font-medium">Amavasya</span>
                  <span className="text-xs text-gray-600">Sep 16</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Auspicious Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-sm font-medium">Ekadashi</span>
                  <span className="text-xs text-gray-600">Sep 12, 23</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                  <span className="text-sm font-medium">Sankranti</span>
                  <span className="text-xs text-gray-600">Sep 17</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
