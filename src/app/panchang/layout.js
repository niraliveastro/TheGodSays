'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, Star, BookOpen, User, Calendar, Zap } from 'lucide-react'
import '../../components/styles/panchangLayout.css'

export default function PanchangLayout({ children }) {
  const pathname = usePathname()
  const items = [
    { href: '/panchang/choghadiya-timings', label: 'Choghadiya', icon: Zap },
    { href: '/panchang/hora-timings', label: 'Hora Timings', icon: Clock },
    { href: '/panchang/maha-dasas', label: 'Maha Dasas', icon: Star },
    { href: '/panchang/calender', label: 'Calendar', icon: Calendar },
  ]

  return (
    <div className="panchang-container">
      {/* Sub-navbar shown only within /panchang */}
      <div className="panchang-subnav">
        <div className="panchang-subnav-inner">
          <nav className="panchang-nav">
            {items.map((it) => {
              const Icon = it.icon
              const isActive = pathname === it.href || pathname.startsWith(it.href + '/')
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`panchang-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon />
                  <span>{it.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="panchang-content">
        {children}
      </div>
    </div>
  )
}