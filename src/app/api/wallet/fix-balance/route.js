import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import admin from 'firebase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

/**
 * ONE-TIME FIX: Recalculate wallet balance from transactions
 * This fixes any accumulated errors from old hold/deduct logic
 */
export async function POST(request) {
  const db = getFirestore()
  
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    
    const walletRef = db.collection('wallets').doc(userId)
    const walletDoc = await walletRef.get()
    
    if (!walletDoc.exists) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    const data = walletDoc.data()
    const transactions = data.transactions || []
    const oldBalance = data.balance || 0
    
    // Recalculate balance from ONLY credit and debit transactions
    // Ignore old 'hold' transactions that caused the issue
    let newBalance = 0
    let creditTotal = 0
    let debitTotal = 0
    
    transactions.forEach(t => {
      if (t.status === 'completed') {
        if (t.type === 'credit') {
          newBalance += t.amount
          creditTotal += t.amount
        } else if (t.type === 'debit') {
          newBalance -= t.amount
          debitTotal += t.amount
        }
        // IGNORE 'hold', 'hold_complete', and other types
      }
    })
    
    newBalance = Math.round(newBalance * 100) / 100
    
    console.log(`🔧 Balance fix for user ${userId}:`)
    console.log(`   Old balance: ₹${oldBalance}`)
    console.log(`   New balance: ₹${newBalance}`)
    console.log(`   Total credits: ₹${creditTotal}`)
    console.log(`   Total debits: ₹${debitTotal}`)
    console.log(`   Difference: ₹${(newBalance - oldBalance).toFixed(2)}`)
    
    // Update the stored balance
    await walletRef.update({
      balance: newBalance,
      balanceFixedAt: admin.firestore.FieldValue.serverTimestamp(),
      previousBalance: oldBalance
    })
    
    return NextResponse.json({
      success: true,
      userId,
      oldBalance,
      newBalance,
      difference: Math.round((newBalance - oldBalance) * 100) / 100,
      creditTotal,
      debitTotal,
      transactionCount: transactions.length
    })
    
  } catch (error) {
    console.error('Error fixing balance:', error)
    return NextResponse.json({
      error: 'Failed to fix balance',
      message: error.message
    }, { status: 500 })
  }
}

