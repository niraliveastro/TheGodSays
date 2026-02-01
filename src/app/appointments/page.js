"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import {
  Calendar,
  Clock,
  User,
  Video,
  MessageSquare,
  X,
  Loader2,
  CalendarCheck,
} from "lucide-react"

export default function Appointments() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/user")
      return
    }
    if (user && userProfile) fetchAppointments()
  }, [user, userProfile, authLoading])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const isAstrologer = userProfile?.collection === "astrologers"
      const id = user.uid
      const url = isAstrologer
        ? `/api/appointments?astrologerId=${id}`
        : `/api/appointments?userId=${id}`

      const res = await fetch(url)
      const data = await res.json()
      if (data.success) setAppointments(data.appointments || [])
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm("Cancel this appointment?")) return

    setCancelling(appointmentId)
    try {
      const isAstrologer = userProfile?.collection === "astrologers"
      const id = user.uid

      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          status: "cancelled",
          [isAstrologer ? "astrologerId" : "userId"]: id,
        }),
      })

      const data = await res.json()
      if (data.success) fetchAppointments()
      else alert(data.error || "Failed to cancel")
    } finally {
      setCancelling(null)
    }
  }

  const handleConnect = (appointment) => {
    localStorage.setItem("tgs:profileCallAstrologerId", appointment.astrologerId)
    localStorage.setItem("tgs:profileCallType", "video")
    localStorage.setItem("tgs:appointmentId", appointment.id)
    router.push("/talk-to-astrologer")
  }

  const getDisplayStatus = (a) => {
    const now = new Date()
    const dt = new Date(`${a.date}T${a.time}`)

    if (a.status === "cancelled") return "cancelled"
    if (a.status === "completed") return "completed"
    if (a.status === "confirmed" || a.status === "pending")
      return dt > now ? "upcoming" : "missed"

    return "missed"
  }

  const filteredAppointments = appointments.filter((a) => {
    const s = getDisplayStatus(a)
    if (filter === "upcoming") return s === "upcoming"
    if (filter === "past") return s === "completed" || s === "missed"
    if (filter === "cancelled") return s === "cancelled"
    return true
  })

  const isAstrologer = userProfile?.collection === "astrologers"

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-gold)]" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "#FFFDF5", padding: "2rem 1rem" }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="title text-2xl font-medium ">
            My Appointments
          </h1>

          {isAstrologer && (
            <button
              onClick={() => router.push("/appointments/availability")}
              className="btn-primary flex items-center gap-2"
            >
              <CalendarCheck size={18} />
              Manage Availability
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "upcoming", "past", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "1px solid var(--color-gold)",
                background:
                  filter === f
                    ? "var(--color-gold)"
                    : "transparent",
                color:
                  filter === f ? "white" : "var(--color-gold-dark)",
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Empty */}
        {filteredAppointments.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar
              size={48}
              className="mx-auto mb-4 opacity-40 text-[var(--color-gold)]"
            />
            <p className="text-slate-500">
              No {filter === "all" ? "" : filter} appointments found.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredAppointments.map((a) => {
              const date = new Date(`${a.date}T${a.time}`)
              const status = getDisplayStatus(a)

              const statusColor = {
                upcoming: "var(--color-gold)",
                completed: "#16a34a",
                missed: "#d97706",
                cancelled: "#dc2626",
              }[status]

              return (
                <div
                  key={a.id}
                  className="card"
                  style={{ padding: "1.5rem" }}
                >
                  <div className="flex justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={18} className="text-[var(--color-gold)]" />
                        <span className="font-semibold text-lg">
                          {isAstrologer ? a.userName : a.astrologerName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "999px",
                            background: "rgba(180,83,9,0.1)",
                            color: statusColor,
                            textTransform: "capitalize",
                          }}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          {date.toLocaleDateString("en-IN", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          {date.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}{" "}
                          ({a.duration} mins)
                        </div>
                        {a.notes && (
                          <div className="flex gap-2 mt-1">
                            <MessageSquare size={16} />
                            {a.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {status === "upcoming" && (
                        <button
                          onClick={() => handleConnect(a)}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Video size={16} />
                          Connect
                        </button>
                      )}

                      {status === "upcoming" && a.status === "confirmed" && (
                        <button
                          onClick={() => handleCancelAppointment(a.id)}
                          disabled={cancelling === a.id}
                          style={{
                            padding: "0.5rem 1rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #dc2626",
                            background: "transparent",
                            color: "#dc2626",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor:
                              cancelling === a.id
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {cancelling === a.id ? (
                            <span className="flex items-center gap-2">
                              <Loader2 size={14} className="animate-spin" />
                              Cancelling…
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <X size={14} />
                              Cancel
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
