'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Wallet as WalletIcon,
  Plus,
  History,
  CreditCard,
  Loader2,
  TicketPercent,
} from 'lucide-react'

// NEW PROJECT (coupons)
import { couponDb, couponFunctions } from '@/lib/firebaseCoupons'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

export default function Wallet() {
  const { user, getUserId, userProfile } = useAuth()
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] })
  const [loading, setLoading] = useState(true)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [showRechargeForm, setShowRechargeForm] = useState(false)
  const [rechargeLoading, setRechargeLoading] = useState(false)

  // Coupon states (NEW)
  const [couponBalance, setCouponBalance] = useState(0)
  const [showCouponField, setShowCouponField] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponStatus, setCouponStatus] = useState(null) // {type,msg}
  const [couponLoading, setCouponLoading] = useState(false)

  const userId = getUserId()

  /* ------------------------------------------------------------------ */
  /*  FETCH WALLET DATA (OLD PROJECT via API)                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (userId) {
      fetchWalletData()
      fetchCouponBalance()
    }
  }, [userId])

  const fetchWalletData = async () => {
    try {
      const res = await fetch('/api/payments/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-balance', userId }),
      })
      if (res.ok) {
        const { success, wallet: data } = await res.json()
        if (success) setWallet(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  FETCH COUPON BALANCE (NEW PROJECT Firestore)                       */
  /* ------------------------------------------------------------------ */
  const fetchCouponBalance = async () => {
    try {
      const ref = doc(couponDb, 'wallets', userId)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setCouponBalance(data.couponBalance || 0)
      } else {
        setCouponBalance(0)
      }
    } catch (e) {
      console.error('Error fetching coupon balance:', e)
      setCouponBalance(0)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  REDEEM COUPON (NEW PROJECT callable function)                      */
  /* ------------------------------------------------------------------ */
const handleRedeemCoupon = async () => {
  if (!couponCode.trim()) {
    setCouponStatus({ type: "error", msg: "Please enter a coupon code" });
    return;
  }

  setCouponLoading(true);
  setCouponStatus({ type: "loading", msg: "Redeeming…" });

  try {
    // get OLD-project ID token
    const idToken = await user.getIdToken();

    const res = await fetch("/api/coupons/redeem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ code: couponCode }),
    });

    const data = await res.json();

    if (data.ok) {
      setCouponStatus({
        type: "success",
        msg: `Coupon applied! +₹${data.amount}`,
      });
      setCouponCode("");
      await fetchCouponBalance();
    } else {
      const map = {
        NOT_FOUND: "Invalid coupon",
        INACTIVE: "Coupon inactive",
        EXPIRED: "Coupon expired",
        MAXED_OUT: "Coupon limit reached",
        USED_BY_YOU: "You already used this coupon",
        BAD_COUPON_AMOUNT: "Coupon not configured correctly",
      };
      setCouponStatus({
        type: "error",
        msg: map[data.reason] || "Coupon invalid",
      });
    }
  } catch (e) {
    setCouponStatus({ type: "error", msg: e.message });
  } finally {
    setCouponLoading(false);
  }
};


  /* ------------------------------------------------------------------ */
  /*  RECHARGE HANDLER (Razorpay) – OLD PROJECT                          */
  /* ------------------------------------------------------------------ */
  const handleRecharge = async () => {
    if (!rechargeAmount || Number(rechargeAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setRechargeLoading(true)
    try {
      const orderRes = await fetch('/api/payments/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recharge',
          userId,
          amount: parseFloat(rechargeAmount),
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok || !orderData.success) {
        alert(orderData.error ?? 'Failed to create payment order')
        return
      }

      const keyRes = await fetch('/api/payments/config')
      const keyData = await keyRes.json()
      if (!keyData.success) {
        alert('Payment configuration error')
        return
      }

      const options = {
        key: keyData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'The God Says',
        description: 'Wallet Recharge',
        order_id: orderData.order.id,
        handler: async (resp) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              userId,
            }),
          })
          const verifyData = await verifyRes.json()
          if (verifyRes.ok && verifyData.success) {
            alert('Payment successful! Wallet updated.')
            setRechargeAmount('')
            setShowRechargeForm(false)
            fetchWalletData()
          } else {
            alert('Payment verification failed. Contact support.')
          }
        },
        prefill: {
          email: user?.email ?? '',
          name: user?.displayName ?? '',
        },
        theme: { color: '#d4af37' },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (e) {
      alert(`Error: ${e.message}`)
    } finally {
      setRechargeLoading(false)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  HELPERS                                                          */
  /* ------------------------------------------------------------------ */
  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt)

  const formatDate = (ts) => {
    let date
    if (ts?._seconds) date = new Date(ts._seconds * 1000)
    else if (ts?.toDate) date = ts.toDate()
    else if (ts?.seconds) date = new Date(ts.seconds * 1000)
    else date = new Date(ts)

    return isNaN(date.getTime())
      ? 'Invalid Date'
      : date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
  }

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                           */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: '2rem', height: '2rem', color: 'var(--color-gold)', animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: '0.5rem', color: 'var(--color-gray-600)' }}>Loading wallet…</span>
      </div>
    )
  }

  if (userProfile?.collection === 'astrologers') {
    return (
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--color-gray-600)' }}>
            Wallet functionality is only available for regular users. Astrologers receive payments directly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto' }}>

      {/* ---------- BALANCE CARD ---------- */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '3rem',
              height: '3rem',
              background: '#dbeafe',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WalletIcon style={{ width: '1.75rem', height: '1.75rem', color: '#2563eb' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>
              Wallet Balance
            </h2>
            <p style={{ color: 'var(--color-gray-600)' }}>Manage your wallet and view history</p>
          </div>
        </div>

        {/* Real Wallet Balance (old project) */}
        <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.5rem' }}>
          {formatCurrency(wallet.balance)}
        </div>

        {/* Coupon Balance (new project) */}
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4338ca', marginBottom: '1rem' }}>
          Coupon Balance: {formatCurrency(couponBalance)}
        </div>

        {/* Actions row */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowRechargeForm(!showRechargeForm)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus style={{ width: '1rem', height: '1rem' }} />
            <span>Add Money</span>
          </button>

          <button
            onClick={() => {
              setShowCouponField(!showCouponField)
              setCouponStatus(null)
            }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <TicketPercent style={{ width: '1rem', height: '1rem' }} />
            <span>Redeem Coupon</span>
          </button>
        </div>
      </div>

      {/* ---------- COUPON REDEEM FORM ---------- */}
      {showCouponField && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            Redeem Coupon
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code"
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.5rem',
                background: 'var(--color-white)',
                fontSize: '1rem',
                textTransform: 'uppercase',
              }}
            />

            <button
              onClick={handleRedeemCoupon}
              disabled={couponLoading}
              className="btn btn-primary"
              style={{ minWidth: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {couponLoading ? (
                <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
              ) : (
                <TicketPercent style={{ width: '1rem', height: '1rem' }} />
              )}
              <span>{couponLoading ? 'Redeeming…' : 'Redeem'}</span>
            </button>
          </div>

          {couponStatus && (
            <p
              style={{
                marginTop: '0.75rem',
                fontWeight: 500,
                color:
                  couponStatus.type === 'success'
                    ? '#16a34a'
                    : couponStatus.type === 'loading'
                    ? '#6b7280'
                    : '#dc2626',
              }}
            >
              {couponStatus.msg}
            </p>
          )}
        </div>
      )}

      {/* ---------- RECHARGE FORM ---------- */}
      {showRechargeForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            Recharge Wallet
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
                Amount (₹)
              </label>
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="e.g. 500"
                min="1"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--color-gray-300)',
                  borderRadius: '0.5rem',
                  background: 'var(--color-white)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleRecharge}
                disabled={rechargeLoading || !rechargeAmount}
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {rechargeLoading ? (
                  <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CreditCard style={{ width: '1rem', height: '1rem' }} />
                )}
                <span>{rechargeLoading ? 'Processing…' : 'Pay Now'}</span>
              </button>

              <button
                onClick={() => setShowRechargeForm(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- TRANSACTION HISTORY ---------- */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <History style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-gray-600)' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Transaction History</h3>
        </div>

        {wallet.transactions.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: '1rem' }}>
            No transactions yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {wallet.transactions.map((t, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'var(--color-gray-50)',
                  borderRadius: '0.5rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>{t.description}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                    {formatDate(t.timestamp)}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p
                    style={{
                      fontWeight: 600,
                      color: t.type === 'credit' ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {t.type === 'credit' ? '+' : '-'}
                    {formatCurrency(t.amount)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', textTransform: 'capitalize' }}>
                    {t.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
