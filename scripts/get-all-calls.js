/**
 * Script to get all calls from the system
 * Usage: node scripts/get-all-calls.js [limit]
 * 
 * Examples:
 *   node scripts/get-all-calls.js          # Get all calls (default: 100)
 *   node scripts/get-all-calls.js 50       # Get last 50 calls
 *   node scripts/get-all-calls.js 1000     # Get last 1000 calls
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local or .env
function loadEnvFile() {
  const envPaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env'),
  ]

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach((line) => {
        const match = line.match(/^([^=:#]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim()
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      })
      break
    }
  }
}

// Load environment variables
loadEnvFile()

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID

    if (!privateKey || !clientEmail || !projectId) {
      console.error('❌ Missing Firebase environment variables!')
      console.error('Required: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID')
      process.exit(1)
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
    console.log('✅ Firebase Admin initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message)
    process.exit(1)
  }
}

const db = getFirestore()

/**
 * Format date to readable string
 */
function formatDate(date) {
  if (!date) return 'N/A'
  try {
    let dateObj
    if (date.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate()
    } else if (typeof date === 'string') {
      dateObj = new Date(date)
    } else if (date._seconds !== undefined) {
      dateObj = new Date(date._seconds * 1000 + (date._nanoseconds || 0) / 1000000)
    } else if (date instanceof Date) {
      dateObj = date
    } else {
      dateObj = new Date(date)
    }

    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date'
    }

    return dateObj.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  } catch (e) {
    return 'Invalid Date'
  }
}

/**
 * Get status color code
 */
function getStatusColor(status) {
  const colors = {
    completed: '\x1b[32m', // Green
    cancelled: '\x1b[33m', // Yellow
    rejected: '\x1b[31m',  // Red
    active: '\x1b[36m',    // Cyan
    pending: '\x1b[35m',   // Magenta
  }
  return colors[status] || '\x1b[0m' // Default/reset
}

/**
 * Get all calls
 */
async function getAllCalls(limit = 100) {
  try {
    console.log(`\n⏳ Fetching last ${limit} calls...\n`)

    // Get calls ordered by createdAt descending
    let snapshot
    try {
      snapshot = await db.collection('calls')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()
    } catch (indexError) {
      console.log('⚠️  Index not ready, fetching without orderBy...')
      snapshot = await db.collection('calls')
        .limit(limit)
        .get()
    }

    const calls = []
    const callIds = []
    const userIds = new Set()
    const astrologerIds = new Set()

    // First pass: collect IDs
    snapshot.docs.forEach((doc) => {
      const callData = doc.data()
      callIds.push(doc.id)
      if (callData.userId) userIds.add(callData.userId)
      if (callData.astrologerId) astrologerIds.add(callData.astrologerId)
    })

    // Batch fetch users, astrologers, and billing data
    const [userDocs, astrologerDocs, billingDocs] = await Promise.all([
      userIds.size > 0 ? Promise.all(Array.from(userIds).map(id => db.collection('users').doc(id).get())) : Promise.resolve([]),
      astrologerIds.size > 0 ? Promise.all(Array.from(astrologerIds).map(id => db.collection('astrologers').doc(id).get())) : Promise.resolve([]),
      callIds.length > 0 ? Promise.all(callIds.map(id => db.collection('call_billing').doc(id).get())) : Promise.resolve([]),
    ])

    // Create lookup maps
    const usersMap = new Map()
    userDocs.forEach(doc => {
      if (doc.exists) {
        const userData = doc.data()
        usersMap.set(doc.id, userData.name || userData.displayName || userData.email || userData.fullName || `User ${doc.id.substring(0, 8)}`)
      }
    })

    const astrologersMap = new Map()
    astrologerDocs.forEach(doc => {
      if (doc.exists) {
        const astrologerData = doc.data()
        astrologersMap.set(doc.id, astrologerData.name || 'Unknown')
      }
    })

    const billingMap = new Map()
    billingDocs.forEach((doc, idx) => {
      if (doc.exists) {
        const billingData = doc.data()
        billingMap.set(callIds[idx], {
          cost: billingData.finalAmount || billingData.totalCost || 0,
          duration: billingData.durationMinutes || 0
        })
      }
    })

    // Build calls array
    snapshot.docs.forEach((doc, idx) => {
      const callData = doc.data()
      const callId = doc.id

      const userName = callData.userId ? (usersMap.get(callData.userId) || `User ${callData.userId.substring(0, 8)}`) : 'Unknown User'
      const astrologerName = callData.astrologerId ? (astrologersMap.get(callData.astrologerId) || 'Unknown') : 'Unknown'

      // Get cost and duration from billing or call data
      const billingData = billingMap.get(callId)
      let cost = 0
      let duration = 0

      if (billingData) {
        cost = billingData.cost || 0
        duration = billingData.duration || 0
      } else {
        cost = callData.finalAmount || 0
        duration = callData.durationMinutes || 0
      }

      const createdAt = callData.createdAt || callData.created_at || null
      const status = callData.status || 'unknown'
      const callType = callData.callType || 'voice'

      calls.push({
        id: callId,
        userName,
        astrologerName,
        callType,
        createdAt,
        duration: typeof duration === 'number' ? duration : parseFloat(duration) || 0,
        cost: typeof cost === 'number' ? cost : parseFloat(cost) || 0,
        status
      })
    })

    // Sort by date if not already sorted (fallback case)
    if (calls.length > 0 && !calls[0].createdAt) {
      // If no dates, keep original order
    } else {
      calls.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt._seconds ? a.createdAt._seconds * 1000 : a.createdAt) : 0
        const dateB = b.createdAt ? new Date(b.createdAt._seconds ? b.createdAt._seconds * 1000 : b.createdAt) : 0
        return dateB - dateA // Descending (newest first)
      })
    }

    return calls
  } catch (error) {
    console.error('Error fetching calls:', error)
    throw error
  }
}

/**
 * Main function
 */
async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : 100

  if (isNaN(limit) || limit <= 0) {
    console.error('❌ Error: Limit must be a positive number!')
    console.error('Usage: node scripts/get-all-calls.js [limit]')
    console.error('Example: node scripts/get-all-calls.js 50')
    process.exit(1)
  }

  try {
    const calls = await getAllCalls(limit)

    if (calls.length === 0) {
      console.log('📭 No calls found.\n')
      return
    }

    // Display results
    console.log('═'.repeat(120))
    console.log('📞 ALL CALLS')
    console.log('═'.repeat(120))
    console.log(`Total Calls: ${calls.length}\n`)

    // Summary statistics
    const statusCounts = {}
    const completedCalls = calls.filter(c => c.status === 'completed')
    const totalSpending = completedCalls.reduce((sum, c) => sum + c.cost, 0)
    const totalDuration = completedCalls.reduce((sum, c) => sum + c.duration, 0)

    calls.forEach(call => {
      statusCounts[call.status] = (statusCounts[call.status] || 0) + 1
    })

    console.log('📊 SUMMARY:')
    console.log(`   Total Calls: ${calls.length}`)
    console.log(`   Completed: ${statusCounts.completed || 0}`)
    console.log(`   Cancelled: ${statusCounts.cancelled || 0}`)
    console.log(`   Rejected: ${statusCounts.rejected || 0}`)
    console.log(`   Active: ${statusCounts.active || 0}`)
    console.log(`   Total Spending: ₹${totalSpending.toFixed(2)}`)
    console.log(`   Total Duration: ${Math.round(totalDuration)} minutes`)
    console.log('─'.repeat(120))
    console.log()

    // Display individual calls
    console.log('📋 CALL DETAILS:')
    console.log('─'.repeat(120))
    
    calls.forEach((call, index) => {
      const statusColor = getStatusColor(call.status)
      const resetColor = '\x1b[0m'
      const callIcon = call.callType === 'video' ? '📹' : '📞'
      
      console.log(`${index + 1}. ${callIcon} Call ID: ${call.id.substring(0, 12)}...`)
      console.log(`   User: ${call.userName}`)
      console.log(`   Astrologer: ${call.astrologerName}`)
      console.log(`   Type: ${call.callType.toUpperCase()}`)
      console.log(`   Date: ${formatDate(call.createdAt)}`)
      console.log(`   Duration: ${call.duration > 0 ? `${call.duration} min` : 'N/A'}`)
      console.log(`   Cost: ${call.cost > 0 ? `₹${call.cost.toFixed(2)}` : '₹0.00'}`)
      console.log(`   Status: ${statusColor}${call.status.toUpperCase()}${resetColor}`)
      console.log('─'.repeat(120))
    })

    console.log(`\n✅ Displayed ${calls.length} call(s)\n`)

    // Return structured data
    return {
      totalCalls: calls.length,
      calls,
      summary: {
        completed: statusCounts.completed || 0,
        cancelled: statusCounts.cancelled || 0,
        rejected: statusCounts.rejected || 0,
        active: statusCounts.active || 0,
        totalSpending,
        totalDuration: Math.round(totalDuration)
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

