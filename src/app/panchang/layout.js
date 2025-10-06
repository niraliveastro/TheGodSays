'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, Star, BookOpen, User, Calendar } from 'lucide-react'

export default function PanchangLayout({ children }) {
  const pathname = usePathname()
  const items = [
    { href: '/panchang/choghadiya-timings', label: 'Choghadiya', icon: Clock },
    { href: '/panchang/hora-timings', label: 'Hora Timings', icon: Clock },
    { href: '/panchang/maha-dasas', label: 'Maha Dasas', icon: Star },
    { href: '/panchang/kundali', label: 'Kundali', icon: BookOpen },
    { href: '/panchang/personalized', label: 'Personalized', icon: User },
    { href: '/panchang/calender', label: 'Calendar', icon: Calendar },
  ]

  return (
    <div className="min-h-screen">
      {/* Sub-navbar shown only within /panchang */}
      <div className="w-full bg-white border-b mt-3">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex items-center justify-center gap-6 py-3">
            {items.map((it) => {
              const Icon = it.icon
              const isActive = pathname === it.href || pathname.startsWith(it.href + '/')
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`flex items-center gap-2 text-sm ${
                    isActive
                      ? 'text-blue-700 underline'
                      : 'text-gray-600 hover:text-blue-600 underline'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{it.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  )
}

