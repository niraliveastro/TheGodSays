'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User, Menu, X, Calendar, Star, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/panchang/calender', label: 'Panchang', icon: Calendar },
    { href: '/matching', label: 'Matching', icon: BookOpen },
    { href: '/predictions', label: 'Predictions', icon: Star },
    { href: '/account', label: 'My Account', icon: User },
  ]

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">👍</span>
            </div>
            <span className="text-xl font-bold text-blue-600">TheGodSays</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                 <Link
                   key={item.href}
                   href={item.href}
                   className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                     pathname === item.href
                       ? 'bg-blue-100 text-blue-700'
                       : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                   }`}
                 >
                   <Icon className="w-4 h-4" />
                   <span>{item.label}</span>
                 </Link>
               )
             })}
           </div>

           {/* Mobile menu button */}
           <div className="md:hidden flex items-center">
             <Button
               variant="ghost"
               onClick={() => setIsOpen(!isOpen)}
             >
               {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
             </Button>
           </div>
          </div>
         {/* Mobile Navigation */}
         {isOpen && (
           <div className="md:hidden">
             <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
               {navItems.map((item) => {
                 const Icon = item.icon
                 return (
                   <Link
                     key={item.href}
                     href={item.href}
                     className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                       pathname === item.href
                         ? 'bg-blue-100 text-blue-700'
                         : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                     }`}
                     onClick={() => setIsOpen(false)}
                   >
                     <Icon className="w-5 h-5" />
                     <span>{item.label}</span>
                   </Link>
                 )
               })}
             </div>
           </div>
         )}
       </div>
     </nav>
   )
 }

 export default Navigation

