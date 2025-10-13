'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { User, Star, ArrowRight } from 'lucide-react'

export default function AuthLanding() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-indigo-50 flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Welcome to TheGodSays</h1>
          <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">Connect with experienced astrologers or share your expertise with seekers worldwide.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 items-stretch">
          {/* User card */}
          <Card className="group relative overflow-hidden p-8 rounded-2xl transform transition duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer" onClick={() => router.push('/auth/user')}>
            <div className="absolute -left-16 -top-16 w-48 h-48 bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex-1 text-center">
                <div className="mx-auto w-20 h-20 flex items-center justify-center mb-6">
                  <User className="w-10 h-10 text-blue-700" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">I am a User</h2>
                <p className="text-slate-600 mb-6 px-6">Seek guidance from experienced astrologers for life questions, career decisions, and personal growth.</p>
              </div>
              <div>
                <Button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow" onClick={() => router.push('/auth/user')}>
                  Continue as User
                  <ArrowRight className="w-4 h-4 opacity-90" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Astrologer card */}
          <Card className="group relative overflow-hidden p-8 rounded-2xl transform transition duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer border-yellow-100" onClick={() => router.push('/auth/astrologer')}>
            <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-gradient-to-br from-yellow-50 to-transparent rounded-full opacity-40 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex-1 text-center">
                <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-br from-yellow-50 to-yellow-100">
                  <Star className="w-10 h-10 text-yellow-700" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">I am an Astrologer</h2>
                <p className="text-slate-600 mb-6 px-6">Share your astrological expertise and help people find clarity while building your practice.</p>
              </div>
              <div>
                <Button className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow" onClick={() => router.push('/auth/astrologer')}>
                  Continue as Astrologer
                  <ArrowRight className="w-4 h-4 opacity-90" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}