"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import FamilyMemberPredictions from "@/components/FamilyMemberPredictions";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/contexts/ThemeContext";

export default function FamilyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isCosmic = theme === 'cosmic';
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [familyForm, setFamilyForm] = useState({
    name: "",
    dob: "",
    time: "",
    place: "",
    relation: "Self",
  });
  const [saving, setSaving] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showPredictions, setShowPredictions] = useState(false);

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      const userId = localStorage.getItem("tgs:userId");
      if (!userId) {
        router.push("/auth/user");
        return;
      }

      try {
        const res = await fetch(`/api/family/members?userId=${userId}`);
        const data = await res.json();
        if (data.success) {
          setFamilyMembers(data.members || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [router]);

  const handleAddFamilyMember = async () => {
    if (
      !familyForm.name ||
      !familyForm.dob ||
      !familyForm.time ||
      !familyForm.place
    ) {
      alert("Please fill all fields");
      return;
    }

    setSaving(true);
    try {
      const userId = localStorage.getItem("tgs:userId");
      const res = await fetch("/api/family/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...familyForm }),
      });
      const data = await res.json();
      if (data.success) {
        setFamilyMembers((prev) => [...prev, data.member]);
        setFamilyForm({
          name: "",
          dob: "",
          time: "",
          place: "",
          relation: "Self",
        });
        setIsFamilyModalOpen(false);
      } else {
        alert(data.message || "Failed to add family member");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleViewPredictions = (member) => {
    setSelectedMember(member);
    setShowPredictions(true);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isCosmic ? "#0a0a0f" : "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)",
        }}
      >
        <Loader2
          className="w-12 h-12 animate-spin"
          style={{ color: "#d4af37" }}
        />
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: isCosmic ? "#0a0a0f" : "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)",
          padding: "2rem 0",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}>
          {/* Header */}
          <div style={{ marginBottom: "2rem" }}>
            <button
              onClick={() => router.push("/profile/user")}
              className="flex items-center gap-2 hover:text-gold transition-colors mb-4"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: isCosmic ? "#d4af37" : "#4b5563",
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Profile
            </button>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    color: "#d4af37",
                    marginBottom: "0.5rem",
                    fontFamily: "'Cormorant Garamond', serif",
                  }}
                >
                  My Family
                </h1>
                <p style={{ color: isCosmic ? "#a78bfa" : "#6b7280", fontSize: "1rem" }}>
                  Manage your family members and view their predictions
                </p>
              </div>

              <Button
                onClick={() => setIsFamilyModalOpen(true)}
                className="btn btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.875rem 1.75rem",
                  fontSize: "1rem",
                }}
              >
                <Plus className="w-5 h-5" />
                Add Family Member
              </Button>
            </div>
          </div>

          {/* Family Members Grid */}
          {familyMembers.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="card"
                  style={{
                    padding: "1.5rem",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    background: isCosmic ? "rgba(22, 33, 62, 0.85)" : "rgba(255, 255, 255, 0.9)",
                    border: isCosmic ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid rgba(212, 175, 55, 0.2)",
                    boxShadow: isCosmic ? "0 4px 6px rgba(0, 0, 0, 0.6)" : "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = isCosmic
                      ? "0 12px 24px rgba(0, 0, 0, 0.8)"
                      : "0 12px 24px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = isCosmic
                      ? "0 4px 6px rgba(0, 0, 0, 0.6)"
                      : "0 4px 6px rgba(0, 0, 0, 0.1)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "1.5rem",
                      }}
                    >
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 700,
                          color: isCosmic ? "#d4af37" : "#1f2937",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {member.name}
                      </h3>
                      <p style={{ fontSize: "0.875rem", color: isCosmic ? "#a78bfa" : "#6b7280" }}>
                        {member.relation}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.625rem",
                      marginBottom: "1.5rem",
                      fontSize: "0.875rem",
                      color: isCosmic ? "#d4af37" : "#4b5563",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Calendar className="w-4 h-4" style={{ color: "#d4af37" }} />
                      <span>
                        {(() => {
                          try {
                            const dobParts = member.dob.split("-").map((n) => parseInt(n, 10));
                            let y, m, d;
                            if (dobParts.length === 3) {
                              if (dobParts[0] > 1900) {
                                [y, m, d] = dobParts;
                              } else {
                                [d, m, y] = dobParts;
                              }
                            }
                            if (y && m && d) {
                              return new Date(y, m - 1, d).toLocaleDateString();
                            }
                            return member.dob;
                          } catch {
                            return member.dob;
                          }
                        })()}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Clock className="w-4 h-4" style={{ color: "#d4af37" }} />
                      <span>{member.time}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <MapPin className="w-4 h-4" style={{ color: "#d4af37" }} />
                      <span>{member.place}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewPredictions(member)}
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "0.875rem",
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    View Predictions
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="card"
              style={{
                padding: "4rem 2rem",
                textAlign: "center",
                background: isCosmic ? "rgba(22, 33, 62, 0.85)" : "rgba(255, 255, 255, 0.9)",
                border: isCosmic ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid rgba(212, 175, 55, 0.2)",
                boxShadow: isCosmic ? "0 4px 6px rgba(0, 0, 0, 0.6)" : "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Users
                className="w-16 h-16 mx-auto mb-4"
                style={{ color: isCosmic ? "#533483" : "#d1d5db" }}
              />
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: isCosmic ? "#d4af37" : "#6b7280",
                  marginBottom: "0.5rem",
                }}
              >
                No Family Members Yet
              </h3>
              <p style={{ color: isCosmic ? "#a78bfa" : "#9ca3af", marginBottom: "1.5rem" }}>
                Add your family members to view their astrological predictions
              </p>
              <Button
                onClick={() => setIsFamilyModalOpen(true)}
                className="btn btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.875rem 1.75rem",
                }}
              >
                <Plus className="w-5 h-5" />
                Add Your First Family Member
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Family Member Modal */}
      <Modal
        open={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        title="Add Family Member"
      >
        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: isCosmic ? "#d4af37" : "#374151" }}
              >
                Name
              </label>
              <input
                type="text"
                value={familyForm.name}
                onChange={(e) =>
                  setFamilyForm({ ...familyForm, name: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                style={{
                  background: isCosmic ? "rgba(10, 10, 15, 0.8)" : "white",
                  border: isCosmic ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid #d1d5db",
                  color: isCosmic ? "#d4af37" : "inherit",
                }}
                placeholder="Enter name"
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: isCosmic ? "#d4af37" : "#374151" }}
              >
                Relation
              </label>
              <select
                value={familyForm.relation}
                onChange={(e) =>
                  setFamilyForm({ ...familyForm, relation: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                style={{
                  background: isCosmic ? "rgba(10, 10, 15, 0.8)" : "white",
                  border: isCosmic ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid #d1d5db",
                  color: isCosmic ? "#d4af37" : "inherit",
                }}
              >
                <option value="Self">Self</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Spouse">Spouse</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: isCosmic ? "#d4af37" : "#374151" }}
              >
                Date of Birth
              </label>
              <input
                type="date"
                value={familyForm.dob}
                onChange={(e) =>
                  setFamilyForm({ ...familyForm, dob: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                style={{
                  background: isCosmic ? "rgba(10, 10, 15, 0.8)" : "white",
                  border: isCosmic ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid #d1d5db",
                  color: isCosmic ? "#d4af37" : "inherit",
                }}
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: isCosmic ? "#d4af37" : "#374151" }}
              >
                Time of Birth
              </label>
              <input
                type="time"
                value={familyForm.time}
                onChange={(e) =>
                  setFamilyForm({ ...familyForm, time: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                style={{
                  background: isCosmic ? "rgba(10, 10, 15, 0.8)" : "white",
                  border: isCosmic ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid #d1d5db",
                  color: isCosmic ? "#d4af37" : "inherit",
                }}
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: isCosmic ? "#d4af37" : "#374151" }}
              >
                Place of Birth
              </label>
              <PlaceAutocomplete
                value={familyForm.place}
                onChange={(val) => setFamilyForm({ ...familyForm, place: val })}
                placeholder="Enter city, country"
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <Button
                onClick={() => setIsFamilyModalOpen(false)}
                variant="outline"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFamilyMember}
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Add Member"
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Predictions Modal */}
      {showPredictions && selectedMember && (
        <FamilyMemberPredictions
          member={selectedMember}
          onClose={() => {
            setShowPredictions(false);
            setSelectedMember(null);
          }}
        />
      )}

      <style jsx>{`
        .card {
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        [data-theme="cosmic"] .card {
          background: rgba(22, 33, 62, 0.85);
          border: 1px solid rgba(212, 175, 55, 0.3);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.6);
        }
        [data-theme="light"] .card,
        :not([data-theme]) .card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(212, 175, 55, 0.2);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}

