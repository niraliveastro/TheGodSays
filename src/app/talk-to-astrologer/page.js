'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Video, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function TalkToAstrologer() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSpecialization, setFilterSpecialization] = useState('')
  const [loading, setLoading] = useState(false)
  const [astrologers, setAstrologers] = useState([])
  const [fetchingAstrologers, setFetchingAstrologers] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchAstrologers()

    // Set up real-time status updates
    const eventSource = new EventSource('/api/events?global=true')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'astrologer-status-updated') {
          setAstrologers(prev => prev.map(astrologer =>
            astrologer.id === data.astrologerId
              ? { ...astrologer, isOnline: data.status === 'online', status: data.status }
              : astrologer
          ))
        }
      } catch (error) {
        console.warn('Error parsing SSE message:', error)
        // Don't break the connection on parse errors
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      // Implement retry logic for global connections
      setTimeout(() => {
        console.log('Retrying global SSE connection...')
        const newEventSource = new EventSource('/api/events?global=true')
        newEventSource.onmessage = eventSource.onmessage
        newEventSource.onerror = eventSource.onerror
        eventSource.close()
        // Replace the old eventSource reference
        Object.setPrototypeOf(newEventSource, eventSource)
      }, 5000)
    }

    return () => eventSource.close()
  }, [])

  // Also fetch initial status for all astrologers
  useEffect(() => {
    const fetchInitialStatuses = async () => {
      if (astrologers.length > 0) {
        try {
          // Fetch all current statuses
          const response = await fetch('/api/astrologer/status')
          const data = await response.json()

          if (data.success && data.astrologers) {
            setAstrologers(prev => prev.map(astrologer => {
              const statusData = data.astrologers.find(s => s.astrologerId === astrologer.id)
              return statusData
                ? { ...astrologer, isOnline: statusData.status === 'online', status: statusData.status }
                : { ...astrologer, isOnline: false, status: 'offline' }
            }))
          }
        } catch (error) {
          console.error('Error fetching initial statuses:', error)
        }
      }
    }

    fetchInitialStatuses()
  }, [astrologers.length]) // Run when astrologers list is populated

  const fetchAstrologers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'astrologers'))
      const astrologersList = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        astrologersList.push({
          id: doc.id,
          name: data.name,
          specialization: data.specialization,
          rating: data.rating || 4.5,
          reviews: data.reviews || 0,
          experience: data.experience,
          languages: data.languages || ['English'],
          isOnline: data.status === 'online',
          bio: data.bio || `Expert in ${data.specialization}`,
          verified: data.verified || false
        })
      })
      setAstrologers(astrologersList)
    } catch (error) {
      console.error('Error fetching astrologers:', error)
    } finally {
      setFetchingAstrologers(false)
    }
  }

  const filteredAstrologers = astrologers.filter(astrologer => {
    const matchesSearch = astrologer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         astrologer.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = !filterSpecialization || astrologer.specialization === filterSpecialization
    return matchesSearch && matchesFilter
  })

  const handleCallNow = async (astrologerId) => {
    setLoading(true)
    try {
      // Use the actual astrologer ID from Firestore
      const backendAstrologerId = astrologerId

      // First check astrologer availability from the API (not local state)
      const statusResponse = await fetch(`/api/astrologer/status?astrologerId=${backendAstrologerId}`)
      const statusData = await statusResponse.json()

      if (!statusData.success) {
        alert('Unable to check astrologer availability. Please try again later.')
        return
      }

      if (statusData.status === 'offline') {
        alert('Astrologer is currently offline. Please try again later.')
        return
      }

      if (statusData.status === 'busy') {
        if (!confirm('Astrologer is currently busy. You will be added to the waiting queue. Do you want to continue?')) {
          setLoading(false)
          return
        }
      }

      // Create call request
      const callResponse = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-call',
          astrologerId: backendAstrologerId,
          userId: `user-${Date.now()}`
        })
      })

      if (!callResponse.ok) throw new Error('Failed to create call request')

      const callData = await callResponse.json()

      if (callData.success) {
        let timeoutId
        // Set up polling to check call status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(
              `/api/calls?astrologerId=${backendAstrologerId}`
            )
            const statusData = await statusResponse.json()

            if (statusData.success) {
              const call = statusData.calls.find(
                (c) => c.id === callData.call.id
              )

              if (call?.status === 'active') {
                clearTimeout(timeoutId)
                clearInterval(pollInterval)

                // Create LiveKit session and join room
                const sessionResponse = await fetch(
                  '/api/livekit/create-session',
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      astrologerId: backendAstrologerId,
                      userId: callData.call.userId,
                      callId: callData.call.id,
                      roomName: call.roomName, // Pass the existing room name
                    }),
                  }
                )

                if (sessionResponse.ok) {
                  const sessionData = await sessionResponse.json()
                  router.push(`/talk-to-astrologer/room/${sessionData.roomName}`)
                } else {
                  alert('Failed to connect to video call. Please try again.')
                }
              } else if (call?.status === 'rejected') {
                clearTimeout(timeoutId)
                clearInterval(pollInterval)
                alert('Astrologer declined the call. Please try again later.')
              }
            }
          } catch (error) {
            console.error('Error checking call status:', error)
          }
        }, 2000)

        // Stop polling after 30 seconds
        timeoutId = setTimeout(() => {
          clearInterval(pollInterval)
          alert('Astrologer is not responding. Please try again.')
        }, 30000)
      }
    } catch (error) {
      console.error('Error starting call:', error)
      alert('Failed to start video call. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Talk to Astrologer</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with experienced astrologers for personalized guidance on love, career, health, and life decisions.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute text-gray-400 w-5 h-5"
                style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search by name or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
              />
            </div>
            <div className="relative">
              <Filter
                className="absolute text-gray-400 w-5 h-5"
                style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <select
                value={filterSpecialization}
                onChange={(e) => setFilterSpecialization(e.target.value)}
                className="py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
              >
                <option value="">All Specializations</option>
                <option value="Vedic Astrology">Vedic Astrology</option>
                <option value="Tarot Reading">Tarot Reading</option>
                <option value="Numerology">Numerology</option>
                <option value="Palmistry">Palmistry</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {fetchingAstrologers && (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2 text-blue-600">
              <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span>Loading astrologers...</span>
            </div>
          </div>
        )}

        {/* Astrologers Grid */}
        {!fetchingAstrologers && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAstrologers.map((astrologer) => (
            <div key={astrologer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {astrologer.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                    astrologer.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{astrologer.name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{astrologer.specialization}</p>
                  <p className="text-xs text-gray-500">{astrologer.experience}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-3">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-gray-900 ml-1">{astrologer.rating}</span>
                </div>
                <span className="text-sm text-gray-500">({astrologer.reviews} reviews)</span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{astrologer.bio}</p>

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Languages:</p>
                <div className="flex flex-wrap gap-2">
                  {astrologer.languages.map((lang, idx) => (
                    <span key={lang + idx} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded mr-1 mb-1">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => handleCallNow(astrologer.id)}
                disabled={!astrologer.isOnline || loading}
                className={`w-full ${
                  astrologer.isOnline 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <Video className="w-4 h-4 mr-2" />
                {astrologer.isOnline ? 'Video Call' : 'Offline'}
              </Button>
            </div>
            ))}
          </div>
        )}

        {!fetchingAstrologers && filteredAstrologers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No astrologers found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}



























































// 'use client'

// import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import { Star, Video, Search, Filter } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { collection, getDocs } from 'firebase/firestore'
// import { db } from '@/lib/firebase'

// export default function TalkToAstrologer() {
//   const [searchTerm, setSearchTerm] = useState('')
//   const [filterSpecialization, setFilterSpecialization] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [astrologers, setAstrologers] = useState([])
//   const [fetchingAstrologers, setFetchingAstrologers] = useState(true)
//   const router = useRouter()

//   useEffect(() => {
//     fetchAstrologers()
    
//     // Set up real-time status updates
//     const eventSource = new EventSource('/api/events?global=true')
    
//     eventSource.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data)
//         if (data.type === 'astrologer-status-updated') {
//           setAstrologers(prev => prev.map(astrologer => 
//             astrologer.id === data.astrologerId 
//               ? { ...astrologer, isOnline: data.status === 'online' }
//               : astrologer
//           ))
//         }
//       } catch (error) {
//         console.warn('Error parsing SSE message:', error)
//       }
//     }
    
//     return () => eventSource.close()
//   }, [])

//   const fetchAstrologers = async () => {
//     try {
//       const querySnapshot = await getDocs(collection(db, 'astrologers'))
//       const astrologersList = []
//       querySnapshot.forEach((doc) => {
//         const data = doc.data()
//         astrologersList.push({
//           id: doc.id,
//           name: data.name,
//           specialization: data.specialization,
//           rating: data.rating || 4.5,
//           reviews: data.reviews || 0,
//           experience: data.experience,
//           languages: data.languages || ['English'],
//           isOnline: data.status === 'online',
//           bio: data.bio || `Expert in ${data.specialization}`,
//           verified: data.verified || false
//         })
//       })
//       setAstrologers(astrologersList)
//     } catch (error) {
//       console.error('Error fetching astrologers:', error)
//     } finally {
//       setFetchingAstrologers(false)
//     }
//   }

//   const filteredAstrologers = astrologers.filter(astrologer => {
//     const matchesSearch = astrologer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          astrologer.specialization.toLowerCase().includes(searchTerm.toLowerCase())
//     const matchesFilter = !filterSpecialization || astrologer.specialization === filterSpecialization
//     return matchesSearch && matchesFilter
//   })

//   const handleCallNow = async (astrologerId) => {
//     setLoading(true)
//     try {
//       // Use the actual astrologer ID from Firestore
//       const backendAstrologerId = astrologerId

//       // First check astrologer availability
//       const statusResponse = await fetch(`/api/astrologer/status?astrologerId=${backendAstrologerId}`)
//       const statusData = await statusResponse.json()


//       if (!statusData.success) {
//         alert('Unable to check astrologer availability. Please try again later.')
//         return
//       }

//       if (statusData.status === 'offline') {
//         alert('Astrologer is currently offline. Please try again later.')
//         return
//       }

//       if (statusData.status === 'busy') {
//         if (!confirm('Astrologer is currently busy. You will be added to the waiting queue. Do you want to continue?')) {
//           setLoading(false)
//           return
//         }
//       }

//       // Create call request
//       const callResponse = await fetch('/api/calls', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           action: 'create-call',
//           astrologerId: backendAstrologerId,
//           userId: `user-${Date.now()}`
//         })
//       })

//       if (!callResponse.ok) throw new Error('Failed to create call request')

//       const callData = await callResponse.json()

//       if (callData.success) {
//         let timeoutId
//         // Set up polling to check call status
//         const pollInterval = setInterval(async () => {
//           try {
//             const statusResponse = await fetch(
//               `/api/calls?astrologerId=${backendAstrologerId}`
//             )
//             const statusData = await statusResponse.json()

//             if (statusData.success) {
//               const call = statusData.calls.find(
//                 (c) => c.id === callData.call.id
//               )

//               if (call?.status === 'active') {
//                 clearTimeout(timeoutId)
//                 clearInterval(pollInterval)

//                 // Create LiveKit session and join room
//                 const sessionResponse = await fetch(
//                   '/api/livekit/create-session',
//                   {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({
//                       astrologerId: backendAstrologerId,
//                       userId: callData.call.userId,
//                       callId: callData.call.id,
//                       roomName: call.roomName, // Pass the existing room name
//                     }),
//                   }
//                 )

//                 if (sessionResponse.ok) {
//                   const { roomName } = await sessionResponse.json()
//                   router.push(`/talk-to-astrologer/room/${roomName}`)
//                 } else {
//                   alert('Failed to connect to video call. Please try again.')
//                 }
//               } else if (call?.status === 'rejected') {
//                 clearTimeout(timeoutId)
//                 clearInterval(pollInterval)
//                 alert('Astrologer declined the call. Please try again later.')
//               }
//             }
//           } catch (error) {
//             console.error('Error checking call status:', error)
//           }
//         }, 2000)

//         // Stop polling after 30 seconds
//         timeoutId = setTimeout(() => {
//           clearInterval(pollInterval)
//           alert('Astrologer is not responding. Please try again.')
//         }, 30000)
//       }
//     } catch (error) {
//       console.error('Error starting call:', error)
//       alert('Failed to start video call. Please try again.')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-4">Talk to Astrologer</h1>
//           <p className="text-lg text-gray-600 max-w-2xl mx-auto">
//             Connect with experienced astrologers for personalized guidance on love, career, health, and life decisions.
//           </p>
//         </div>

//         {/* Search and Filter */}
//         <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
//           <div className="flex flex-col sm:flex-row gap-4">
//             <div className="flex-1 relative">
//               <Search
//                 className="absolute text-gray-400 w-5 h-5"
//                 style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
//               />
//               <input
//                 type="text"
//                 placeholder="Search by name or specialization..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
//               />
//             </div>
//             <div className="relative">
//               <Filter
//                 className="absolute text-gray-400 w-5 h-5"
//                 style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
//               />
//               <select
//                 value={filterSpecialization}
//                 onChange={(e) => setFilterSpecialization(e.target.value)}
//                 className="py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
//               >
//                 <option value="">All Specializations</option>
//                 <option value="Vedic Astrology">Vedic Astrology</option>
//                 <option value="Tarot Reading">Tarot Reading</option>
//                 <option value="Numerology">Numerology</option>
//                 <option value="Palmistry">Palmistry</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Loading State */}
//         {fetchingAstrologers && (
//           <div className="text-center py-12">
//             <div className="inline-flex items-center space-x-2 text-blue-600">
//               <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
//               <span>Loading astrologers...</span>
//             </div>
//           </div>
//         )}

//         {/* Astrologers Grid */}
//         {!fetchingAstrologers && (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredAstrologers.map((astrologer) => (
//             <div key={astrologer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-start space-x-4 mb-4">
//                 <div className="relative">
//                   <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
//                     {astrologer.name.split(' ').map(n => n[0]).join('')}
//                   </div>
//                   <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
//                     astrologer.isOnline ? 'bg-green-500' : 'bg-gray-400'
//                   }`} />
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-semibold text-gray-900">{astrologer.name}</h3>
//                   <p className="text-sm text-blue-600 font-medium">{astrologer.specialization}</p>
//                   <p className="text-xs text-gray-500">{astrologer.experience}</p>
//                 </div>
//               </div>

//               <div className="flex items-center space-x-2 mb-3">
//                 <div className="flex items-center">
//                   <Star className="w-4 h-4 text-yellow-400 fill-current" />
//                   <span className="text-sm font-medium text-gray-900 ml-1">{astrologer.rating}</span>
//                 </div>
//                 <span className="text-sm text-gray-500">({astrologer.reviews} reviews)</span>
//               </div>

//               <p className="text-sm text-gray-600 mb-4">{astrologer.bio}</p>

//               <div className="mb-4">
//                 <p className="text-xs text-gray-500 mb-1">Languages:</p>
//                 <div className="flex flex-wrap gap-2">
//                   {astrologer.languages.map((lang, idx) => (
//                     <span key={lang + idx} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded mr-1 mb-1">
//                       {lang}
//                     </span>
//                   ))}
//                 </div>
//               </div>

//               <Button
//                 onClick={() => handleCallNow(astrologer.id)}
//                 disabled={!astrologer.isOnline || loading}
//                 className={`w-full ${
//                   astrologer.isOnline 
//                     ? 'bg-green-600 hover:bg-green-700' 
//                     : 'bg-gray-400 cursor-not-allowed'
//                 }`}
//               >
//                 <Video className="w-4 h-4 mr-2" />
//                 {astrologer.isOnline ? 'Video Call' : 'Offline'}
//               </Button>
//             </div>
//             ))}
//           </div>
//         )}

//         {!fetchingAstrologers && filteredAstrologers.length === 0 && (
//           <div className="text-center py-12">
//             <p className="text-gray-500">No astrologers found matching your criteria.</p>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }
