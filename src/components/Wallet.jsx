"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Wallet as WalletIcon,
  Plus,
  History,
  CreditCard,
  Loader2,
  TicketPercent,
} from "lucide-react";

import {
  trackEvent,
  trackActionStart,
  trackActionComplete,
  trackActionAbandon,
} from "@/lib/analytics";

export default function Wallet() {
  const { user, getUserId, userProfile } = useAuth();
  const userId = getUserId();

  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);

  const [rechargeAmount, setRechargeAmount] = useState("");
  const [showRechargeForm, setShowRechargeForm] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);

  const [showCouponField, setShowCouponField] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  /* ---------- TRANSACTION PAGINATION ---------- */
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  /* ------------------------------------------------------------------ */
  /*  FETCH WALLET DATA                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (userId) fetchWalletData();
  }, [userId]);

  const fetchWalletData = async () => {
    try {
      const res = await fetch("/api/payments/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-balance", userId }),
      });
      if (res.ok) {
        const { success, wallet: data } = await res.json();
        if (success) setWallet(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  HELPERS                                                           */
  /* ------------------------------------------------------------------ */
  const formatCurrency = (amt) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amt);

  const formatDate = (ts) => {
    let date;
    if (ts?._seconds) date = new Date(ts._seconds * 1000);
    else if (ts?.toDate) date = ts.toDate();
    else if (ts?.seconds) date = new Date(ts.seconds * 1000);
    else date = new Date(ts);

    return isNaN(date.getTime())
      ? "Invalid Date"
      : date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const getTimestamp = (ts) => {
    if (!ts) return 0;
    if (ts._seconds) return ts._seconds * 1000;
    if (ts.toDate) return ts.toDate().getTime();
    if (ts.seconds) return ts.seconds * 1000;
    return new Date(ts).getTime();
  };

  const sortedTransactions = useMemo(() => {
    return [...wallet.transactions].sort(
      (a, b) => getTimestamp(b.timestamp) - getTimestamp(a.timestamp)
    );
  }, [wallet.transactions]);

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return sortedTransactions.slice(start, end);
  }, [sortedTransactions, currentPage]);


  /* ------------------------------------------------------------------ */
  /*  LOADING / ACCESS STATES                                            */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-gold)]" />
        <span className="ml-2 text-gray-600">Loading wallet…</span>
      </div>
    );
  }

  if (userProfile?.collection === "astrologers") {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-gray-600">
          Wallet functionality is only available for regular users.
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="max-w-3xl mx-auto">
      {/* ---------- BALANCE CARD ---------- */}
      <div className="card mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <WalletIcon className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Wallet Balance</h2>
            <p className="text-gray-600">Manage your wallet and view history</p>
          </div>
        </div>

        <div className="text-4xl font-bold text-green-600 mb-4">
          {formatCurrency(wallet.balance)}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowRechargeForm(!showRechargeForm)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Money
          </button>

          <button
            onClick={() => {
              setShowCouponField(!showCouponField);
              setCouponStatus(null);
            }}
            className="btn btn-outline flex items-center gap-2"
          >
            <TicketPercent className="w-4 h-4" />
            Redeem Coupon
          </button>
        </div>
      </div>

      {/* ---------- TRANSACTION HISTORY ---------- */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Transaction History</h3>
        </div>

        {wallet.transactions.length === 0 ? (
          <p className="text-center text-gray-500 p-4">No transactions yet</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {paginatedTransactions.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{t.description}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(t.timestamp)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        t.type === "credit" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {t.type === "credit" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {t.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="btn btn-outline disabled:opacity-50 w-full sm:w-auto"
                >
                  Previous
                </button>

                <p className="text-sm text-gray-600">
                  Page <span className="font-semibold">{currentPage}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </p>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="btn btn-primary disabled:opacity-50 w-full sm:w-auto"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
