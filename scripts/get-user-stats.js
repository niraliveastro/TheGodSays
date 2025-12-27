/**
 * Script to get user spending statistics and balance
 * Usage: node scripts/get-user-stats.js <userId>
 * 
 * Example: node scripts/get-user-stats.js abc123xyz
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
 * Get user spending statistics
 */
async function getUserSpending(userId) {
  try {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() // 0-11 (0 = January, 11 = December)
    const currentYear = currentDate.getFullYear()
    
    // Current month (December) boundaries
    const currentMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0)
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    // Last month (November) boundaries
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const lastMonthStart = new Date(lastMonthYear, lastMonth, 1, 0, 0, 0, 0)
    const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59, 999)

    // Get all completed billing records for this user
    const billingSnapshot = await db.collection('call_billing')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .get()

    let totalSpending = 0
    let currentMonthSpending = 0
    let lastMonthSpending = 0

    billingSnapshot.forEach((doc) => {
      const billingData = doc.data()
      const cost = billingData.finalAmount || billingData.totalCost || 0
      const costNum = typeof cost === 'number' ? cost : parseFloat(cost) || 0

      if (costNum > 0 && !isNaN(costNum)) {
        totalSpending += costNum

        // Check if this billing is from current month or last month
        let billingDate = null
        const dateField = billingData.createdAt || billingData.startTime || billingData.created_at

        if (dateField) {
          try {
            if (dateField.toDate && typeof dateField.toDate === 'function') {
              billingDate = dateField.toDate()
            } else if (typeof dateField === 'string') {
              billingDate = new Date(dateField)
            } else if (dateField._seconds !== undefined) {
              billingDate = new Date(dateField._seconds * 1000 + (dateField._nanoseconds || 0) / 1000000)
            } else if (dateField instanceof Date) {
              billingDate = dateField
            } else {
              billingDate = new Date(dateField)
            }

            if (isNaN(billingDate.getTime())) {
              billingDate = null
            }
          } catch (e) {
            console.warn(`Warning: Error parsing date for billing ${doc.id}:`, e.message)
            billingDate = null
          }
        }

        // Check if billing is from current month (December)
        if (billingDate && billingDate >= currentMonthStart && billingDate <= currentMonthEnd) {
          currentMonthSpending += costNum
        }
        // Check if billing is from last month (November)
        else if (billingDate && billingDate >= lastMonthStart && billingDate <= lastMonthEnd) {
          lastMonthSpending += costNum
        }
      }
    })

    // Get month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthName = monthNames[currentMonth]
    const lastMonthName = monthNames[lastMonth]

    return { 
      totalSpending, 
      currentMonthSpending,
      lastMonthSpending,
      currentMonthName,
      lastMonthName
    }
  } catch (error) {
    console.error('Error calculating spending:', error)
    throw error
  }
}

/**
 * Get user wallet balance
 */
async function getUserBalance(userId) {
  try {
    const walletDoc = await db.collection('wallets').doc(userId).get()

    if (!walletDoc.exists) {
      return { balance: 0, exists: false }
    }

    const walletData = walletDoc.data()
    const transactions = walletData.transactions || []

    // Calculate balance from transactions (using same logic as WalletService)
    let balance = 0
    if (!transactions || !Array.isArray(transactions)) {
      balance = 0
    } else {
      transactions.forEach((transaction) => {
        if (transaction.status === 'completed') {
          switch (transaction.type) {
            case 'credit':
              balance += transaction.amount || 0
              break
            case 'debit':
              balance -= transaction.amount || 0
              break
            case 'hold':
              // Completed hold transactions should be deducted as they represent finalized charges
              balance -= transaction.amount || 0
              break
            default:
              break
          }
        } else if (transaction.status === 'pending' && transaction.type === 'hold') {
          // Pending hold transactions should be deducted from available balance
          // as they represent reserved funds
          balance -= transaction.amount || 0
        }
      })
    }

    // Round to 2 decimal places
    balance = Math.round(balance * 100) / 100

    return { balance, exists: true }
  } catch (error) {
    console.error('Error getting wallet balance:', error)
    throw error
  }
}

/**
 * Main function
 */
async function main() {
  const userId = process.argv[2]

  if (!userId) {
    console.error('❌ Error: userId is required!')
    console.error('Usage: node scripts/get-user-stats.js <userId>')
    console.error('Example: node scripts/get-user-stats.js abc123xyz')
    process.exit(1)
  }

  console.log(`\n📊 Fetching statistics for user: ${userId}\n`)
  console.log('⏳ Loading...\n')

  try {
    // Fetch spending and balance in parallel
    const [spending, wallet] = await Promise.all([
      getUserSpending(userId),
      getUserBalance(userId),
    ])

    // Display results
    console.log('═'.repeat(50))
    console.log('📈 USER STATISTICS')
    console.log('═'.repeat(50))
    console.log(`User ID: ${userId}`)
    console.log('─'.repeat(50))
    console.log(`💰 Total Spending:           ₹${spending.totalSpending.toFixed(2)}`)
    console.log(`📅 ${spending.currentMonthName} Spending:    ₹${spending.currentMonthSpending.toFixed(2)}`)
    console.log(`📅 ${spending.lastMonthName} Spending:    ₹${spending.lastMonthSpending.toFixed(2)}`)
    console.log(`💵 Balance Left:             ₹${wallet.balance.toFixed(2)}`)
    if (!wallet.exists) {
      console.log(`   ⚠️  Wallet not found (using default balance of ₹0.00)`)
    }
    console.log('═'.repeat(50))
    console.log('\n✅ Done!\n')

    // Return structured data for programmatic use
    return {
      userId,
      totalSpending: spending.totalSpending,
      currentMonthSpending: spending.currentMonthSpending,
      lastMonthSpending: spending.lastMonthSpending,
      currentMonthName: spending.currentMonthName,
      lastMonthName: spending.lastMonthName,
      balance: wallet.balance,
      walletExists: wallet.exists,
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

