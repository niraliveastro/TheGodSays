"use client";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { astrologyAPI } from "@/lib/api";
import {
  Heart, Star, AlertCircle, Phone, Download, Users,
  Calendar, MapPin, Loader2, Plus, Clock, ChevronDown, ChevronUp,
  Search, X, Moon, Sparkles
} from "lucide-react";
import "./matching-styles.css";

export default function KundliMatchingPage() {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [matchingData, setMatchingData] = useState(null);

  // Form data for both persons
  const [person1, setPerson1] = useState({
    name: "",
    gender: "Male",
    dob: "",
    tob: "",
    place: "",
    latitude: null,
    longitude: null,
    timezone: 5.5
  });

  const [person2, setPerson2] = useState({
    name: "",
      gender: "Female",
    dob: "",
    tob: "",
    place: "",
    latitude: null,
    longitude: null,
    timezone: 5.5
  });

  // Place search states
  const [placeSearch1, setPlaceSearch1] = useState("");
  const [placeSuggestions1, setPlaceSuggestions1] = useState([]);
  const [searching1, setSearching1] = useState(false);
  const [placeSelected1, setPlaceSelected1] = useState(false);
  const searchTimer1Ref = useRef(null);

  const [placeSearch2, setPlaceSearch2] = useState("");
  const [placeSuggestions2, setPlaceSuggestions2] = useState([]);
  const [searching2, setSearching2] = useState(false);
  const [placeSelected2, setPlaceSelected2] = useState(false);
  const searchTimer2Ref = useRef(null);

  // Fetch place suggestions with debouncing
  const fetchPlaceSuggestions = useCallback((query, setPerson, setSuggestions, setSearching, timerRef) => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!query || query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    // Debounce the search
    timerRef.current = setTimeout(async () => {
      try {
        // Use server-side proxy to avoid CORS issues
        const url = `/api/geocode?q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          throw new Error('Search failed');
        }

        const data = await res.json();
        console.log('Place search results:', data);
        
        const suggestions = data.map(item => ({
          name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon)
        }));
        
        setSuggestions(suggestions);
      } catch (err) {
        console.error("Place search error:", err);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500); // 500ms debounce
  }, []);

  // Handle place selection
  const handlePlaceSelect = (place, setPerson, setSearchQuery, setSuggestions, setPlaceSelected) => {
    setPerson(prev => ({
      ...prev,
      place: place.name,
      latitude: place.lat,
      longitude: place.lon
    }));
    setSearchQuery(place.name);
    setSuggestions([]);
    setPlaceSelected(true);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate
      if (!person1.name || !person1.dob || !person1.tob || !person1.place) {
        throw new Error("Please fill in all fields for Person 1");
      }
      if (!person2.name || !person2.dob || !person2.tob || !person2.place) {
        throw new Error("Please fill in all fields for Person 2");
      }
      if (!person1.latitude || !person2.latitude) {
        throw new Error("Please select valid places from suggestions");
      }

      // Parse dates and times
      const [year1, month1, date1] = person1.dob.split('-').map(Number);
      const [hours1, minutes1] = person1.tob.split(':').map(Number);

      const [year2, month2, date2] = person2.dob.split('-').map(Number);
      const [hours2, minutes2] = person2.tob.split(':').map(Number);

      // Build payload for matching API
      const payload = {
        male: {
          year: year1,
          month: month1,
          date: date1,
          hours: hours1,
          minutes: minutes1,
          seconds: 0,
          latitude: person1.latitude,
          longitude: person1.longitude,
          timezone: person1.timezone
        },
        female: {
          year: year2,
          month: month2,
          date: date2,
          hours: hours2,
          minutes: minutes2,
          seconds: 0,
          latitude: person2.latitude,
          longitude: person2.longitude,
          timezone: person2.timezone
        },
        config: {
          observation_point: "topocentric",
          ayanamsha: "lahiri"
        }
      };

      console.log("Matching Payload:", payload);

      // Fetch matching score AND individual person data in parallel
      const [matchResult, person1Data, person2Data] = await Promise.all([
        astrologyAPI.getSingleCalculation('match-making/ashtakoot-score', payload),
        astrologyAPI.getSingleCalculation('planets/extended', {
          year: parseInt(person1.dob.split('-')[0]),
          month: parseInt(person1.dob.split('-')[1]),
          date: parseInt(person1.dob.split('-')[2]),
          hours: parseInt(person1.tob.split(':')[0]),
          minutes: parseInt(person1.tob.split(':')[1]),
          seconds: 0,
          latitude: person1.latitude,
          longitude: person1.longitude,
          timezone: person1.timezone,
          config: { observation_point: "topocentric", ayanamsha: "lahiri" }
        }),
        astrologyAPI.getSingleCalculation('planets/extended', {
          year: parseInt(person2.dob.split('-')[0]),
          month: parseInt(person2.dob.split('-')[1]),
          date: parseInt(person2.dob.split('-')[2]),
          hours: parseInt(person2.tob.split(':')[0]),
          minutes: parseInt(person2.tob.split(':')[1]),
          seconds: 0,
          latitude: person2.latitude,
          longitude: person2.longitude,
          timezone: person2.timezone,
          config: { observation_point: "topocentric", ayanamsha: "lahiri" }
        })
      ]);

      console.log("=== MATCHING API RESPONSES ===");
      console.log("Matching Result (raw):", matchResult);
      console.log("Matching Result Type:", typeof matchResult);
      console.log("Matching Result Keys:", matchResult ? Object.keys(matchResult) : 'null');
      console.log("Person 1 Data (raw):", person1Data);
      console.log("Person 1 Data Type:", typeof person1Data);
      console.log("Person 2 Data (raw):", person2Data);
      console.log("Person 2 Data Type:", typeof person2Data);
      console.log("===============================");

      // Parse match result - handle multiple possible response structures
      let parsedResult = matchResult;
      
      // If it's a string, parse it
      if (typeof matchResult === 'string') {
        try {
          parsedResult = JSON.parse(matchResult);
        } catch (e) {
          console.error("Failed to parse result string:", e);
        }
      }
      
      // If there's an output field that's a string, parse it
      if (parsedResult?.output && typeof parsedResult.output === 'string') {
        try {
          parsedResult = JSON.parse(parsedResult.output);
        } catch (e) {
          console.error("Failed to parse output string:", e);
        }
      }
      
      // If output is an object, use it directly
      if (parsedResult?.output && typeof parsedResult.output === 'object') {
        parsedResult = parsedResult.output;
      }

      console.log("Matching Result (parsed):", parsedResult);

      // Extract person-specific astrological data
      const extractPersonData = (data) => {
        console.log("Extracting person data from:", data);
        
        // Handle response structure: {statusCode: 200, output: {...}}
        const output = data?.output || data;
        
        // Ascendant = Lagna
        const lagna = output?.Ascendant?.zodiac_sign_name || 
                     output?.ascendant?.zodiac_sign_name ||
                     output?.Ascendant?.name || 
                     output?.ascendant?.name || 
                     output?.lagna?.name ||
                     output?.lagna || 
                     'N/A';
                     
        // Moon sign = Rashi
        const rashi = output?.Moon?.zodiac_sign_name ||
                     output?.moon?.zodiac_sign_name ||
                     output?.Moon?.name ||
                     output?.moon_sign?.name ||
                     output?.moon_sign ||
                     output?.rashi?.name ||
                     output?.rashi ||
                     'N/A';
                     
        // Nakshatra from Moon
        const nakshatra = output?.Moon?.nakshatra_name ||
                         output?.moon?.nakshatra_name ||
                         output?.nakshatra?.name ||
                         output?.nakshatra ||
                         'N/A';
        
        console.log("Extracted:", { lagna, rashi, nakshatra });
        
        return { lagna, rashi, nakshatra };
      };

    setMatchingData({
        person1: { ...person1, astro: extractPersonData(person1Data) },
        person2: { ...person2, astro: extractPersonData(person2Data) },
        result: parsedResult,
        timestamp: Date.now()
      });

    } catch (err) {
      console.error("=== MATCHING ERROR ===");
      console.error("Error:", err);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      console.error("=====================");
      setError(err.message || "Failed to calculate compatibility. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get ashtakoota details
  const getAshtakootaDetails = () => {
    if (!matchingData || !matchingData.result) {
      console.log("No matching data available");
      return null;
    }

    const result = matchingData.result;
    console.log("=== ASHTAKOOTA EXTRACTION ===");
    console.log("Raw result:", result);
    console.log("Result type:", typeof result);
    console.log("Result keys:", result ? Object.keys(result) : 'null');
    
    // Handle API response structure: {statusCode: 200, output: {...}}
    const output = result?.output || result;
    console.log("Output:", output);
    console.log("Output type:", typeof output);
    console.log("Output keys:", output ? Object.keys(output) : 'null');
    
    // Try different possible structures
    const ashtakootaData = output?.ashtakoota || output;
    console.log("Ashtakoota data:", ashtakootaData);
    console.log("Ashtakoota data keys:", ashtakootaData ? Object.keys(ashtakootaData) : 'null');
    
    // Helper to get numeric value
    const getScore = (koota, name) => {
      console.log(`  Checking ${name}:`, koota, typeof koota);
      if (typeof koota === 'number') return koota;
      if (koota?.received_points !== undefined) return koota.received_points;
      if (koota?.points !== undefined) return koota.points;
      if (koota?.score !== undefined) return koota.score;
      if (koota?.value !== undefined) return koota.value;
      return 0;
    };
    
    const details = {
      total: ashtakootaData?.total_points || ashtakootaData?.total || ashtakootaData?.score || ashtakootaData?.total_score || 0,
      maxTotal: 36,
      varna: getScore(ashtakootaData?.varna, 'varna'),
      vashya: getScore(ashtakootaData?.vashya, 'vashya'),
      tara: getScore(ashtakootaData?.tara, 'tara'),
      yoni: getScore(ashtakootaData?.yoni, 'yoni'),
      graha_maitri: getScore(ashtakootaData?.graha_maitri || ashtakootaData?.maitri || ashtakootaData?.graha_maitri, 'graha_maitri'),
      gana: getScore(ashtakootaData?.gana, 'gana'),
      bhakoot: getScore(ashtakootaData?.bhakoot, 'bhakoot'),
      nadi: getScore(ashtakootaData?.nadi, 'nadi')
    };
    
    console.log("Final extracted Ashtakoota details:", details);
    console.log("==============================");
    return details;
  };

  const getMatchingGrade = (score) => {
    if (score >= 28) return { grade: 'Excellent', color: '#10b981' };
    if (score >= 24) return { grade: 'Very Good', color: '#3b82f6' };
    if (score >= 18) return { grade: 'Good', color: '#f59e0b' };
    if (score >= 12) return { grade: 'Average', color: '#f59e0b' };
    return { grade: 'Challenging', color: '#ef4444' };
  };

  const ashtakoota = getAshtakootaDetails();
  const gradeInfo = ashtakoota ? getMatchingGrade(ashtakoota.total) : null;

  return (
    <div className="kundli-matching-container">
      {/* Sticky Bottom CTA Bar */}
      <div className="sticky-cta-bar">
        <button className="cta-btn cta-primary" onClick={() => router.push('/talk-to-astrologer')}>
          <Phone size={18} />
          <span>Talk to Astrologer</span>
        </button>
        <button className="cta-btn cta-secondary" onClick={() => router.push('/profile')}>
          <Plus size={18} />
          <span>Add Family</span>
        </button>
        <button className="cta-btn cta-tertiary" disabled={!matchingData}>
          <Download size={18} />
          <span>Download Report</span>
        </button>
      </div>

      <div className="matching-content">
        {/* INPUT FORM */}
        {!matchingData && (
          <section className="form-section">
            <div className="form-card">
              <h1 className="form-title">
                <Heart size={32} />
                Kundli Matching
              </h1>
              <p className="form-subtitle">
                Check compatibility between two people using Vedic astrology
              </p>

              <form onSubmit={handleSubmit} className="matching-form">
                {/* Person 1 */}
                <div className="person-section">
                  <h3 className="person-title">
                    <Users size={20} />
                    Person 1 (Boy)
                  </h3>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      value={person1.name}
                      onChange={(e) => setPerson1({...person1, name: e.target.value})}
                      className="form-input"
                      placeholder="Enter name"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        value={person1.dob}
                        onChange={(e) => setPerson1({...person1, dob: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Time of Birth</label>
                      <input
                        type="time"
                        value={person1.tob}
                        onChange={(e) => setPerson1({...person1, tob: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <MapPin size={18} />
                      Place of Birth
                    </label>
                    <div className="place-search-wrapper">
                      <div className="place-search-container">
                        <input
                          type="text"
                          value={placeSearch1}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPlaceSearch1(value);
                            setPlaceSelected1(false);
                            fetchPlaceSuggestions(value, setPerson1, setPlaceSuggestions1, setSearching1, searchTimer1Ref);
                          }}
                          onFocus={(e) => {
                            if (e.target.value.length >= 2 && !placeSelected1) {
                              fetchPlaceSuggestions(e.target.value, setPerson1, setPlaceSuggestions1, setSearching1, searchTimer1Ref);
                            }
                          }}
                          className="form-input"
                          placeholder="Type city name (e.g., Mumbai, Delhi)..."
                          autoComplete="off"
                        />
                        {searching1 && (
                          <div className="search-spinner">
                            <Loader2 size={18} className="animate-spin" />
                          </div>
                        )}
                      </div>

                      {placeSuggestions1.length > 0 && (
                        <div className="place-suggestions">
                          {placeSuggestions1.map((place, index) => (
                            <button
                              key={index}
                              type="button"
                              className="place-suggestion-item"
                              onClick={() => handlePlaceSelect(place, setPerson1, setPlaceSearch1, setPlaceSuggestions1, setPlaceSelected1)}
                            >
                              <MapPin size={14} />
                              <span>{place.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {!searching1 && !placeSelected1 && placeSearch1.length >= 2 && placeSuggestions1.length === 0 && (
                        <div className="place-suggestions">
                          <div className="no-results">
                            <AlertCircle size={16} />
                            <span>No places found. Try a different search.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Person 2 */}
                <div className="person-section">
                  <h3 className="person-title">
                    <Users size={20} />
                    Person 2 (Girl)
                  </h3>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      value={person2.name}
                      onChange={(e) => setPerson2({...person2, name: e.target.value})}
                      className="form-input"
                      placeholder="Enter name"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        value={person2.dob}
                        onChange={(e) => setPerson2({...person2, dob: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Time of Birth</label>
                      <input
                        type="time"
                        value={person2.tob}
                        onChange={(e) => setPerson2({...person2, tob: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <MapPin size={18} />
                      Place of Birth
                    </label>
                    <div className="place-search-wrapper">
                      <div className="place-search-container">
                        <input
                          type="text"
                          value={placeSearch2}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPlaceSearch2(value);
                            setPlaceSelected2(false);
                            fetchPlaceSuggestions(value, setPerson2, setPlaceSuggestions2, setSearching2, searchTimer2Ref);
                          }}
                          onFocus={(e) => {
                            if (e.target.value.length >= 2 && !placeSelected2) {
                              fetchPlaceSuggestions(e.target.value, setPerson2, setPlaceSuggestions2, setSearching2, searchTimer2Ref);
                            }
                          }}
                          className="form-input"
                          placeholder="Type city name (e.g., Mumbai, Delhi)..."
                          autoComplete="off"
                        />
                        {searching2 && (
                          <div className="search-spinner">
                            <Loader2 size={18} className="animate-spin" />
                          </div>
                        )}
                      </div>

                      {placeSuggestions2.length > 0 && (
                        <div className="place-suggestions">
                          {placeSuggestions2.map((place, index) => (
                            <button
                              key={index}
                              type="button"
                              className="place-suggestion-item"
                              onClick={() => handlePlaceSelect(place, setPerson2, setPlaceSearch2, setPlaceSuggestions2, setPlaceSelected2)}
                            >
                              <MapPin size={14} />
                              <span>{place.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {!searching2 && !placeSelected2 && placeSearch2.length >= 2 && placeSuggestions2.length === 0 && (
                        <div className="place-suggestions">
                          <div className="no-results">
                            <AlertCircle size={16} />
                            <span>No places found. Try a different search.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="error-message">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Calculating Compatibility...
                    </>
                  ) : (
                    <>
                      <Heart size={20} />
                      Check Compatibility
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* RESULTS */}
        {matchingData && ashtakoota && (
          <>
            {/* Couple Header */}
        <section className="couple-header-section">
          <div className="couple-cards-container">
                <div className="couple-card person1-card">
              <div className="card-badge">Boy</div>
              <div className="person-avatar">
                <Users size={40} />
              </div>
                  <h2 className="person-name">{matchingData.person1.name}</h2>
              
              <div className="person-details">
                <div className="detail-row">
                  <Calendar size={14} />
                      <span>{new Date(matchingData.person1.dob).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="detail-row">
                      <Clock size={14} />
                      <span>{matchingData.person1.tob}</span>
                </div>
                <div className="detail-row">
                      <MapPin size={14} />
                      <span>{matchingData.person1.place}</span>
                </div>
              </div>
            </div>

            <div className="couple-divider">
              <Heart size={32} className="heart-icon" />
            </div>

                <div className="couple-card person2-card">
              <div className="card-badge">Girl</div>
              <div className="person-avatar">
                <Users size={40} />
              </div>
                  <h2 className="person-name">{matchingData.person2.name}</h2>
              
              <div className="person-details">
                <div className="detail-row">
                  <Calendar size={14} />
                      <span>{new Date(matchingData.person2.dob).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="detail-row">
                      <Clock size={14} />
                      <span>{matchingData.person2.tob}</span>
                </div>
                <div className="detail-row">
                      <MapPin size={14} />
                      <span>{matchingData.person2.place}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

            {/* Compatibility Score */}
        <section className="compatibility-score-section">
          <div className="score-card-main">
            <div className="score-header">
              <Star size={32} className="star-icon" />
              <h2>Compatibility Score</h2>
            </div>

            <div className="guna-score-display">
              <div className="score-circle-large">
                <svg viewBox="0 0 200 200" className="score-svg">
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="90" 
                    fill="none" 
                    stroke="#e5e7eb" 
                    strokeWidth="20"
                  />
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="90" 
                    fill="none" 
                        stroke={gradeInfo.color}
                    strokeWidth="20"
                    strokeDasharray={`${(ashtakoota.total / ashtakoota.maxTotal) * 565} 565`}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="score-text-overlay">
                  <span className="score-main">{ashtakoota.total}</span>
                  <span className="score-divider">/</span>
                  <span className="score-max">{ashtakoota.maxTotal}</span>
                </div>
              </div>

              <div className="score-details">
                    <div className="grade-badge" style={{ backgroundColor: `${gradeInfo.color}20`, color: gradeInfo.color }}>
                      {gradeInfo.grade}
                </div>
                <p className="verdict-text">
                      {gradeInfo.grade === 'Excellent' && "Excellent compatibility! This match has strong potential for a harmonious marriage."}
                      {gradeInfo.grade === 'Very Good' && "Very good compatibility. The couple can build a strong relationship with mutual understanding."}
                      {gradeInfo.grade === 'Good' && "Good compatibility. With effort and understanding, this can be a successful match."}
                      {gradeInfo.grade === 'Average' && "Average compatibility. Both partners need to work together to strengthen the relationship."}
                      {gradeInfo.grade === 'Challenging' && "Challenging compatibility. Professional consultation recommended."}
                </p>
              </div>
            </div>
          </div>
        </section>

            {/* Individual Astro Details */}
            <section className="astro-details-section">
              <div className="astro-cards-grid">
                <div className="astro-info-card">
                  <div className="astro-icon">
                    <Star size={24} />
                  </div>
                  <div className="astro-label">LAGNA (ASCENDANT)</div>
                  <div className="astro-value">{matchingData.person1.astro?.lagna || 'N/A'}</div>
                </div>

                <div className="astro-info-card">
                  <div className="astro-icon">
                    <Moon size={24} />
              </div>
                  <div className="astro-label">RASHI (MOON SIGN)</div>
                  <div className="astro-value">{matchingData.person1.astro?.rashi || 'N/A'}</div>
            </div>

                <div className="astro-info-card">
                  <div className="astro-icon">
                    <Sparkles size={24} />
                  </div>
                  <div className="astro-label">NAKSHATRA</div>
                  <div className="astro-value">{matchingData.person1.astro?.nakshatra || 'N/A'}</div>
                </div>
          </div>
        </section>

            {/* Ashtakoota Breakdown */}
        <section className="ashtakoota-section">
            <h2 className="section-title">
              <Star size={24} />
              Ashtakoota Breakdown
            </h2>

          <div className="ashtakoota-grid">
                {[
                  { name: 'Varna', score: ashtakoota.varna, max: 1, meaning: 'Spiritual compatibility' },
                  { name: 'Vashya', score: ashtakoota.vashya, max: 2, meaning: 'Mutual attraction' },
                  { name: 'Tara', score: ashtakoota.tara, max: 3, meaning: 'Health & prosperity' },
                  { name: 'Yoni', score: ashtakoota.yoni, max: 4, meaning: 'Physical compatibility' },
                  { name: 'Graha Maitri', score: ashtakoota.graha_maitri, max: 5, meaning: 'Mental compatibility' },
                  { name: 'Gana', score: ashtakoota.gana, max: 6, meaning: 'Temperament match' },
                  { name: 'Bhakoot', score: ashtakoota.bhakoot, max: 7, meaning: 'Love & affection' },
                  { name: 'Nadi', score: ashtakoota.nadi, max: 8, meaning: 'Genetic compatibility' }
                ].map((koota, index) => {
                  const percentage = (koota.score / koota.max) * 100;
  const isPassing = percentage >= 50;

  return (
                    <div key={index} className={`ashtakoota-item ${isPassing ? 'passing' : 'failing'}`}>
      <div className="item-header">
                        <span className="item-name">{koota.name}</span>
                        <span className="item-score">{koota.score}/{koota.max}</span>
      </div>

      <div className="item-bar">
        <div 
          className="item-fill"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: isPassing ? '#10b981' : '#ef4444'
          }}
        />
      </div>

                      <p className="item-meaning">{koota.meaning}</p>
    </div>
  );
                })}
              </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
              <div className="cta-card">
                <h3>Need Expert Guidance?</h3>
                <p>Talk to our experienced astrologers for detailed analysis and personalized advice for your relationship.</p>
                <button 
                  className="cta-button"
                  onClick={() => router.push('/talk-to-astrologer')}
                >
                  <Phone size={20} />
                  Consult Astrologer Now
                </button>
        </div>
            </section>

            {/* New Matching Button */}
            <div className="new-matching-section">
          <button 
                className="new-matching-btn"
                onClick={() => {
                  setMatchingData(null);
                  setPerson1({
                    name: "",
                    gender: "Male",
                    dob: "",
                    tob: "",
                    place: "",
                    latitude: null,
                    longitude: null,
                    timezone: 5.5
                  });
                  setPerson2({
                    name: "",
                    gender: "Female",
                    dob: "",
                    tob: "",
                    place: "",
                    latitude: null,
                    longitude: null,
                    timezone: 5.5
                  });
                  setPlaceSearch1("");
                  setPlaceSearch2("");
                }}
              >
                <Plus size={20} />
                New Matching
          </button>
      </div>
          </>
        )}
      </div>
    </div>
  );
}
