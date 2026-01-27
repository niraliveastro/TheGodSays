"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  const fetchWalletData = useCallback(async () => {
    if (!userId) return;
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
  }, [userId]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

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
  /*  RECHARGE HANDLER                                                  */
  /* ------------------------------------------------------------------ */
  const handleRecharge = async (e) => {
    e.preventDefault();
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setRechargeLoading(true);
    trackActionStart("wallet_recharge");

    try {
      // Get Razorpay key
      const configRes = await fetch("/api/payments/config");
      const configData = await configRes.json();
      if (!configData.success || !configData.key) {
        throw new Error("Payment gateway not configured");
      }

      // Create order
      const amount = parseFloat(rechargeAmount);
      const res = await fetch("/api/payments/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recharge",
          userId,
          amount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create payment order");
      }

      // Check if Razorpay is loaded
      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Payment gateway is not loaded. Please refresh the page.");
      }

      // Open Razorpay checkout
      const options = {
        key: configData.key,
        amount: data.order.amount, // Amount in paise
        currency: data.order.currency,
        name: "TheGodSays",
        description: "Wallet Recharge",
        order_id: data.order.id,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              trackActionComplete("wallet_recharge");
              alert("Payment successful! Your wallet has been recharged.");
              setShowRechargeForm(false);
              setRechargeAmount("");
              fetchWalletData(); // Refresh wallet data
            } else {
              throw new Error(verifyData.error || "Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            trackActionAbandon("wallet_recharge");
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: userProfile?.name || user?.displayName || "",
          email: user?.email || "",
        },
        theme: {
          color: "#d4af37",
        },
        modal: {
          ondismiss: function () {
            trackActionAbandon("wallet_recharge");
            setRechargeLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response);
        trackActionAbandon("wallet_recharge");
        
        let errorMessage = "Payment failed. ";
        if (response.error) {
          if (response.error.code === "BAD_REQUEST_ERROR") {
            errorMessage += "Invalid payment request. Please contact support.";
          } else if (response.error.code === "GATEWAY_ERROR") {
            errorMessage += "Payment gateway error. Please try again.";
          } else if (response.error.code === "SERVER_ERROR") {
            errorMessage += "Server error. Please try again later.";
          } else {
            errorMessage += response.error.description || "Please try again.";
          }
        } else {
          errorMessage += "Please try again.";
        }
        
        alert(errorMessage);
        setRechargeLoading(false);
      });
      razorpay.open();
    } catch (error) {
      console.error("Recharge error:", error);
      trackActionAbandon("wallet_recharge");
      alert(error.message || "Failed to initiate payment. Please try again.");
      setRechargeLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  COUPON REDEMPTION HANDLER                                         */
  /* ------------------------------------------------------------------ */
  const handleCouponRedeem = async (e) => {
    e.preventDefault();
    if (!couponCode || !couponCode.trim()) {
      setCouponStatus({ success: false, message: "Please enter a coupon code" });
      return;
    }

    setCouponLoading(true);
    setCouponStatus(null);

    try {
      // Get Firebase ID token
      if (!user) {
        throw new Error("User not authenticated");
      }
      const token = await user.getIdToken();

      // Redeem coupon
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: couponCode.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setCouponStatus({
          success: true,
          message: `Coupon redeemed successfully! ₹${data.amount} added to your wallet.`,
        });
        setCouponCode("");
        fetchWalletData(); // Refresh wallet data
        trackEvent("coupon_redeemed", { amount: data.amount });
      } else {
        let errorMessage = "Failed to redeem coupon";
        switch (data.reason) {
          case "NOT_FOUND":
            errorMessage = "Coupon code not found";
            break;
          case "INACTIVE":
            errorMessage = "This coupon is inactive";
            break;
          case "EXPIRED":
            errorMessage = "This coupon has expired";
            break;
          case "USED_BY_YOU":
            errorMessage = "You have already used this coupon";
            break;
          case "MAXED_OUT":
            errorMessage = "This coupon has reached its maximum usage limit";
            break;
          case "BAD_CODE":
            errorMessage = "Invalid coupon code";
            break;
          default:
            errorMessage = data.reason || errorMessage;
        }
        setCouponStatus({ success: false, message: errorMessage });
      }
    } catch (error) {
      console.error("Coupon redemption error:", error);
      setCouponStatus({
        success: false,
        message: error.message || "Failed to redeem coupon. Please try again.",
      });
    } finally {
      setCouponLoading(false);
    }
  };


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
            onClick={() => {
              setShowRechargeForm(!showRechargeForm);
              if (showRechargeForm) setRechargeAmount("");
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Money
          </button>

          <button
            onClick={() => {
              setShowCouponField(!showCouponField);
              setCouponStatus(null);
              if (!showCouponField) setCouponCode("");
            }}
            className="btn btn-outline flex items-center gap-2"
          >
            <TicketPercent className="w-4 h-4" />
            Redeem Coupon
          </button>
        </div>

        {/* ---------- RECHARGE FORM ---------- */}
        {showRechargeForm && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Add Money to Wallet
            </h3>
            <form onSubmit={handleRecharge} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  id="amount"
                  min="1"
                  step="0.01"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent"
                  required
                  disabled={rechargeLoading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum amount: ₹1
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={rechargeLoading || !rechargeAmount}
                  className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {rechargeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Proceed to Payment
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRechargeForm(false);
                    setRechargeAmount("");
                  }}
                  className="btn btn-outline"
                  disabled={rechargeLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------- COUPON REDEMPTION FORM ---------- */}
        {showCouponField && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TicketPercent className="w-5 h-5" />
              Redeem Coupon Code
            </h3>
            <form onSubmit={handleCouponRedeem} className="space-y-4">
              <div>
                <label htmlFor="couponCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code
                </label>
                <input
                  type="text"
                  id="couponCode"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent uppercase"
                  required
                  disabled={couponLoading}
                />
              </div>
              {couponStatus && (
                <div
                  className={`p-3 rounded-lg ${
                    couponStatus.success
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <p className="text-sm font-medium">{couponStatus.message}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={couponLoading || !couponCode}
                  className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {couponLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    <>
                      <TicketPercent className="w-4 h-4" />
                      Redeem Coupon
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCouponField(false);
                    setCouponCode("");
                    setCouponStatus(null);
                  }}
                  className="btn btn-outline"
                  disabled={couponLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
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
