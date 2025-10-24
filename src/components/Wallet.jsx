'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Wallet as WalletIcon, Plus, History, CreditCard } from 'lucide-react'

export default function Wallet() {
  const { user, getUserId, userProfile } = useAuth()
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] })
  const [loading, setLoading] = useState(true)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [showRechargeForm, setShowRechargeForm] = useState(false)
  const [rechargeLoading, setRechargeLoading] = useState(false)

  const userId = getUserId()

  useEffect(() => {
    if (userId) {
      fetchWalletData()
    }
  }, [userId])

  const fetchWalletData = async () => {
    try {
      const response = await fetch('/api/payments/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-balance', userId })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const walletData = data.wallet
          setWallet(walletData)
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateBalanceFromTransactions = (transactions) => {
    let balance = 0
    if (!transactions || !Array.isArray(transactions)) {
      return balance
    }

    transactions.forEach(transaction => {
      if (transaction.status === 'completed') {
        switch (transaction.type) {
          case 'credit':
            balance += transaction.amount
            break
          case 'debit':
            balance -= transaction.amount
            break
          case 'hold':
            //Hold transactions are temporary reservations and should not affect
            //the final balance calculation. They will be either converted to
            //debit transactions (for actual charges) or result in credit
            //transactions (for refunds of unused amounts)
            break
          default:
            break
        }
      } else if (transaction.status === 'pending' && transaction.type === 'hold') {
        //Pending hold transactions should be deducted from available balance
        //as they represent reserved funds
        balance -= transaction.amount
      }
    })

    return Math.round(balance * 100) / 100 // Round to 2 decimal places
  }

  const handleRecharge = async () => {
    if (!rechargeAmount || rechargeAmount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setRechargeLoading(true)
    try {
      const response = await fetch('/api/payments/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recharge',
          userId,
          amount: parseFloat(rechargeAmount)
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Get Razorpay key from server
          const keyResponse = await fetch('/api/payments/config')
          const keyData = await keyResponse.json()

          if (!keyResponse.ok || !keyData.success) {
            alert('Payment configuration error. Please try again.')
            return
          }

          // Initialize Razorpay payment
          const options = {
            key: keyData.key,
            amount: data.order.amount,
            currency: data.order.currency,
            name: 'The God Says',
            description: 'Wallet Recharge',
            order_id: data.order.id,
            handler: async function (response) {
              // Verify payment
              const verifyResponse = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId
                })
              })

              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json()
                if (verifyData.success) {
                  alert('Payment successful! Wallet updated.')
                  setRechargeAmount('')
                  setShowRechargeForm(false)
                  fetchWalletData() // Refresh wallet data
                } else {
                  alert('Payment verification failed. Please contact support.')
                }
              } else {
                alert('Payment verification failed. Please contact support.')
              }
            },
            prefill: {
              email: user?.email || '',
              name: user?.displayName || ''
            },
            theme: {
              color: '#3399cc'
            }
          }

          const rzp = new window.Razorpay(options)
          rzp.open()
        } else {
          alert('Failed to create payment order. Please try again.')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`Failed to initiate recharge: ${errorData.error || 'Please try again.'}`)
      }
    } catch (error) {
      console.error('Error during recharge:', error)
      alert(`An error occurred: ${error.message || 'Please try again.'}`)
    } finally {
      setRechargeLoading(false)
    }
  }



  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (timestamp) => {
    let date
    if (timestamp && timestamp._seconds) {
      // Firestore Timestamp in client format
      date = new Date(timestamp._seconds * 1000)
    } else if (timestamp && timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate()
    } else if (timestamp && timestamp.seconds) {
      // Firestore Timestamp with seconds
      date = new Date(timestamp.seconds * 1000)
    } else {
      // Regular Date or string
      date = new Date(timestamp)
    }

    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Only regular users can access wallet, not astrologers
  if (userProfile?.collection === 'astrologers') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600">Wallet functionality is only available for regular users. Astrologers receive payments directly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Wallet Balance Card */}
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <WalletIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Wallet Balance</h2>
            <p className="text-gray-600">Manage your wallet and view transaction history</p>
          </div>
        </div>

        <div className="text-4xl font-bold text-green-600 mb-4">
          {formatCurrency(wallet.balance)}
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={() => setShowRechargeForm(!showRechargeForm)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Money</span>
          </Button>
        </div>
      </Card>

      {/* Recharge Form */}
      {showRechargeForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recharge Wallet</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                step="0.01"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleRecharge}
                disabled={rechargeLoading || !rechargeAmount}
                className="flex items-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>{rechargeLoading ? 'Processing...' : 'Pay Now'}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRechargeForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction History */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <History className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Transaction History</h3>
        </div>

        {wallet.transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {wallet.transactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(transaction.timestamp)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{transaction.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}