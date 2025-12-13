"use client";

import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  User,
  Calendar,
  MapPin,
  Clock,
  Star,
  Info,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import ChoghadiyaForm from "@/components/ChoghadiyaForm";
import ChoghadiyaResults from "@/components/ChoghadiyaResults";
import AstrologyOptions from "@/components/AstrologyOptions";
import AstrologyResults from "@/components/AstrologyResults";
import { mockPersonalizedData } from "@/lib/mockData";
import { astrologyAPI } from "@/lib/api";
import { PageLoading } from "@/components/LoadingStates";

export default function PersonalizedPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [personalizedData] = useState(mockPersonalizedData);

  const [choghadiyaData, setChoghadiyaData] = useState(null);
  const [isLoadingChoghadiya, setIsLoadingChoghadiya] = useState(false);
  const [choghadiyaError, setChoghadiyaError] = useState(null);

  const [selectedAstrologyOptions, setSelectedAstrologyOptions] = useState([]);
  const [astrologyResults, setAstrologyResults] = useState(null);
  const [isLoadingAstrology, setIsLoadingAstrology] = useState(false);
  const [astrologyErrors, setAstrologyErrors] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleChoghadiyaSubmit = async (payload) => {
    setIsLoadingChoghadiya(true);
    setChoghadiyaError(null);
    try {
      const data = await astrologyAPI.getTimings(payload);
      setChoghadiyaData(data);
    } catch (error) {
      setChoghadiyaError(
        "Failed to fetch Choghadiya timings. Please try again."
      );
    } finally {
      setIsLoadingChoghadiya(false);
    }
  };

  const handleAstrologyOptionsSubmit = async (optionIds) => {
    setIsLoadingAstrology(true);
    setAstrologyErrors(null);
    setSelectedAstrologyOptions(optionIds);

    const payload = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      date: new Date().getDate(),
      hours: 12,
      minutes: 0,
      seconds: 0,
      latitude: 1.4433887,
      longitude: 103.8325013,
      timezone: 8,
      config: {
        observation_point: "geocentric",
        ayanamsha: "lahiri",
      },
    };

    try {
      const { results, errors } = await astrologyAPI.getMultipleCalculations(
        optionIds,
        payload
      );
      setAstrologyResults(results);
      setAstrologyErrors(errors);
    } catch (error) {
      setAstrologyErrors({
        general: "Failed to fetch astrological data. Please try again.",
      });
    } finally {
      setIsLoadingAstrology(false);
    }
  };

  return (
    <>
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap");

        :global(body) {
          margin: 0;
          background: #fdfbf7;
          font-family: "Inter", sans-serif;
        }

        .app {
          min-height: 100vh;
          padding: 1.5rem 1rem;
          margin: 0 auto;
          position: relative;
          max-width: 100%;
        }
        @media (min-width: 640px) {
          .app {
            padding: 2rem 1.5rem;
          }
        }
        @media (min-width: 768px) {
          .app {
            max-width: 720px;
          }
        }
        @media (min-width: 1024px) {
          .app {
            max-width: 960px;
          }
        }
        @media (min-width: 1280px) {
          .app {
            max-width: 1200px;
          }
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.18;
          animation: float 22s ease-in-out infinite;
          width: 300px;
          height: 300px;
        }
        @media (min-width: 640px) {
          .orb {
            width: 500px;
            height: 500px;
          }
        }
        .orb1 {
          top: 5%;
          left: 5%;
          background: linear-gradient(135deg, #d4af37, #7c3aed);
        }
        .orb2 {
          bottom: 5%;
          right: 5%;
          background: linear-gradient(135deg, #7c3aed, #b8972e);
          animation-delay: 7s;
        }
        .orb3 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, #d4af37, transparent);
          animation-delay: 14s;
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .headerIcon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.75rem;
          box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
        }
        .title {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #d4af37, #b8972e);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }
        .subtitle {
          color: #555;
          margin-top: 0.5rem;
          font-size: 1rem;
        }

        .card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s, box-shadow 0.3s;
          margin-bottom: 2rem;
        }
        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        .cardHeader {
          padding: 1rem 1.5rem;
          background: #fefce8;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }
        .cardTitle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #7c2d12;
        }
        .cardBody {
          padding: 1.5rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #444;
          font-size: 0.95rem;
        }
        input,
        select {
          width: 100%;
          padding: 0.65rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-size: 0.925rem;
          transition: all 0.2s;
        }
        input:focus,
        select:focus {
          outline: none;
          border-color: #d4af37;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.3);
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-weight: 600;
          transition: all 0.3s;
          cursor: pointer;
        }
        .btn:hover {
          background: #f9fafb;
          border-color: #d4af37;
          color: #b8972e;
          transform: translateY(-1px);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: #d4af37;
          color: #fff;
          border: none;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }
        .btn-primary:hover {
          background: #e6c04a;
          transform: translateY(-2px);
        }

        .error {
          color: #b91c1c;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .profile-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .profile-item {
          text-align: center;
          padding: 1rem;
          border-radius: 0.75rem;
          background: #fefce8;
          border: 1px solid rgba(212, 175, 55, 0.3);
        }
        .profile-label {
          font-size: 0.875rem;
          color: #7c2d12;
          margin-bottom: 0.25rem;
        }
        .profile-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #b8972e;
        }

        .dasha-row {
          display: flex;
          justify-content: space-between;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
        }
        .dasha-label {
          font-weight: 600;
          color: #444;
        }
        .dasha-value {
          font-weight: 700;
          color: #b8972e;
        }

        .note-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          margin: 10px;
          background: #fefce8;
          border-radius: 0.75rem;
          border-left: 4px solid #d4af37;
        }
        .note-dot {
          width: 8px;
          height: 8px;
          background: #d4af37;
          border-radius: 50%;
          margin-top: 0.5rem;
          flex-shrink: 0;
        }

        .hora-item {
          display: flex;
          justify-content: space-between;
          padding: 1rem;
          margin: 10px;
          background: #ecfdf5;
          border-radius: 0.75rem;
          border: 1px solid #bbf7d0;
        }
        .hora-time {
          font-size: 0.875rem;
          color: #065f46;
        }
        .hora-reason {
          font-size: 0.875rem;
          color: #15803d;
          text-align: right;
        }

        .section {
          margin-bottom: 2rem;
        }
        .sectionTitle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 1.25rem;
          color: #7c2d12;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.875rem;
          color: #b91c1c;
          font-size: 0.9rem;
          margin-top: 1rem;
        }
      `}</style>

      {/* Show full-page loading when either calculation is in progress */}
      {(isLoadingChoghadiya || isLoadingAstrology) ? (
        <PageLoading 
          type="panchang" 
          message={isLoadingChoghadiya ? "Calculating Choghadiya timings..." : "Calculating astrological data..."} 
        />
      ) : (
      <div className="app">
        <div
          style={{
            position: "fixed",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        {!isSubmitted ? (
          <>
            <header className="header">
              <div className="headerIcon">
                <Star style={{ width: 36, height: 36, color: "#fff" }} />
              </div>
              <h1 className="title">Personalized Panchang</h1>
              <p className="subtitle">
                Enter your birth details for personalized insights
              </p>
            </header>

            <div className="card">
              <div className="cardHeader">
                <div className="cardTitle">
                  <User style={{ width: 20, height: 20 }} /> Birth Details
                </div>
              </div>
              <div className="cardBody">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label>Full Name</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <label>Date of Birth</label>
                    <input
                      name="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label>Time of Birth</label>
                    <input
                      name="birthTime"
                      type="time"
                      value={formData.birthTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label>Place of Birth</label>
                    <input
                      name="birthPlace"
                      value={formData.birthPlace}
                      onChange={handleInputChange}
                      placeholder="City, State, Country"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full">
                    Get Personalized Panchang
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="header">
              <div className="headerIcon">
                <Star style={{ width: 36, height: 36, color: "#fff" }} />
              </div>
              <h1 className="title">Your Personalized Panchang</h1>
              <p className="subtitle">
                Welcome, {personalizedData.userProfile.name}
              </p>
            </header>

            {/* Astrological Profile */}
            <div className="card section">
              <div className="cardHeader">
                <div className="cardTitle">
                  <Star style={{ width: 20, height: 20 }} /> Your Astrological
                  Profile
                </div>
              </div>
              <div className="cardBody">
                <div className="profile-grid">
                  <div className="profile-item">
                    <div className="profile-label">Lagna</div>
                    <div className="profile-value">
                      {personalizedData.userProfile.lagna}
                    </div>
                  </div>
                  <div className="profile-item">
                    <div className="profile-label">Moon Sign</div>
                    <div className="profile-value">
                      {personalizedData.userProfile.moonSign}
                    </div>
                  </div>
                  <div className="profile-item">
                    <div className="profile-label">Nakshatra</div>
                    <div className="profile-value">
                      {personalizedData.userProfile.nakshatra}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dasha */}
            <div className="card section">
              <div className="cardHeader">
                <div className="cardTitle">
                  <Calendar style={{ width: 20, height: 20 }} /> Current Dasha
                  Period
                </div>
              </div>
              <div className="cardBody">
                <div className="dasha-row">
                  <div>
                    <div className="dasha-label">Mahadasha</div>
                    <div className="dasha-value">
                      {personalizedData.dasha.mahadasha}
                    </div>
                  </div>
                  <div>
                    <div className="dasha-label">Antardasha</div>
                    <div className="dasha-value">
                      {personalizedData.dasha.antardasha}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "#fefce8",
                    borderRadius: ".75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: ".5rem",
                    }}
                  >
                    <Info
                      style={{
                        width: 20,
                        height: 20,
                        color: "#d4af37",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: "#7c2d12" }}>
                        Meaning
                      </div>
                      <div style={{ color: "#555", fontSize: ".9rem" }}>
                        {personalizedData.dasha.meaning}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personalized Notes */}
            <div className="card section">
              <div className="cardHeader">
                <div className="cardTitle">Today's Personalized Insights</div>
              </div>
              <div className="cardBody">
                {personalizedData.personalizedNotes.map((note, i) => (
                  <div key={i} className="note-item">
                    <div className="note-dot" />
                    <p style={{ margin: 0, color: "#555" }}>{note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Horas */}
            <div className="card section">
              <div className="cardHeader">
                <div className="cardTitle">Recommended Horas for You</div>
              </div>
              <div className="cardBody">
                {personalizedData.recommendedHoras.map((hora, i) => (
                  <div key={i} className="hora-item">
                    <div>
                      <div style={{ fontWeight: 600, color: "#166534" }}>
                        {hora.planet}
                      </div>
                      <div className="hora-time">
                        {hora.start} - {hora.end}
                      </div>
                    </div>
                    <div className="hora-reason">{hora.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Astrology Options */}
            <div className="section">
              <div className="sectionTitle">
                <ChevronDown style={{ width: 20, height: 20 }} />
                Advanced Astrology Calculations
              </div>
              <div className="card">
                <div className="cardBody">
                  <AstrologyOptions
                    onOptionSelect={handleAstrologyOptionsSubmit}
                    isLoading={isLoadingAstrology}
                  />
                  {astrologyErrors && (
                    <div className="error-alert">
                      <AlertCircle style={{ width: 20, height: 20 }} />
                      {astrologyErrors.general || "Some calculations failed."}
                    </div>
                  )}
                  {astrologyResults && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <AstrologyResults
                        results={astrologyResults}
                        selectedOptions={selectedAstrologyOptions}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Choghadiya */}
            <div className="section">
              <div className="sectionTitle">
                <Clock style={{ width: 20, height: 20 }} />
                Choghadiya Timings
              </div>
              <div className="card">
                <div className="cardBody">
                  <ChoghadiyaForm
                    onSubmit={handleChoghadiyaSubmit}
                    isLoading={isLoadingChoghadiya}
                  />
                  {choghadiyaError && (
                    <div className="error-alert">
                      <AlertCircle style={{ width: 20, height: 20 }} />
                      {choghadiyaError}
                    </div>
                  )}
                  {choghadiyaData && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <ChoghadiyaResults data={choghadiyaData} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </>
  );
}
