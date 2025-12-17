
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { useChatState } from '@/hooks/useChatState';
import { incrementGuestUsage } from '@/lib/guest-usage';
import { useRouter } from 'next/navigation';
function buildContextPrompt(initialData, pageTitle, language = 'en') {
  // If Matching page AND both charts exist
  if (pageTitle === "Matching" && initialData?.female && initialData?.male) {
    const female = initialData.female;
    const male = initialData.male;
    const match = initialData.match || {};
    
    // Extract key information - handle both input.details structure and direct structure
    const femaleName = female?.input?.name || female?.details?.name || "Female";
    const maleName = male?.input?.name || male?.details?.name || "Male";
    const femaleDob = female?.input?.dob || "";
    const maleDob = male?.input?.dob || "";
    const femaleTob = female?.input?.tob || "";
    const maleTob = male?.input?.tob || "";
    const femalePlace = female?.input?.place || "";
    const malePlace = male?.input?.place || "";
    
    // Calculate birth years for realistic date validation
    const getBirthYear = (dob) => {
      if (!dob) return null;
      try {
        // Try YYYY-MM-DD format first
        const parts = dob.split("-");
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            return parseInt(parts[0], 10);
          } else {
            // DD-MM-YYYY
            return parseInt(parts[2], 10);
          }
        }
      } catch (e) {
        console.warn('[Chat] Failed to parse DOB:', dob, e);
      }
      return null;
    };
    
    const femaleBirthYear = getBirthYear(femaleDob);
    const maleBirthYear = getBirthYear(maleDob);
    const currentYear = new Date().getFullYear();
    
    // Calculate realistic age ranges
    const femaleAge = femaleBirthYear ? currentYear - femaleBirthYear : null;
    const maleAge = maleBirthYear ? currentYear - maleBirthYear : null;
    
    // Extract planetary data - handle both structures
    const femalePlacements = female?.details?.placements || female?.placements || [];
    const malePlacements = male?.details?.placements || male?.placements || [];
    const femaleShadbala = female?.details?.shadbalaRows || female?.shadbalaRows || [];
    const maleShadbala = male?.details?.shadbalaRows || male?.shadbalaRows || [];
    
    // Extract Dasha data - try multiple paths and also check raw vimsottari data
    let femaleDasha = female?.details?.currentDasha || female?.currentDasha || null;
    let maleDasha = male?.details?.currentDasha || male?.currentDasha || null;
    
    // Helper function to extract Dasha from vimsottari data
    const extractDashaFromVims = (vims) => {
      if (!vims) return null;
      
      // Try current/running/now structure
      const cur = vims.current || vims.running || vims.now || vims?.mahadasha?.current;
      if (cur && (cur.md || cur.mahadasha)) {
        const md = cur.md || cur.mahadasha;
        const ad = cur.ad || cur.antardasha;
        const pd = cur.pd || cur.pratyantar;
        return [md, ad, pd]
          .filter(Boolean)
          .map((x) => (x.name || x.planet || x).toString().trim())
          .join(" > ");
      }
      
      // Try mahadasha_list structure
      const md = (vims.mahadasha_list || vims.mahadasha || vims.md || [])[0];
      if (md) {
        const adList = vims.antardasha_list || vims.antardasha || vims.ad || {};
        const firstMdKey = md?.key || md?.planet || md?.name;
        const ad = Array.isArray(adList[firstMdKey])
          ? adList[firstMdKey][0]
          : Array.isArray(adList)
            ? adList[0]
            : null;
        if (ad) {
          return [
            md?.name || md?.planet,
            ad?.name || ad?.planet,
          ]
            .filter(Boolean)
            .join(" > ");
        }
        return md?.name || md?.planet || null;
      }
      
      return null;
    };
    
    // If Dasha is not found, try to extract from raw vimsottari data
    if (!femaleDasha && female?.details?.vimsottari) {
      femaleDasha = extractDashaFromVims(female.details.vimsottari);
    }
    
    if (!maleDasha && male?.details?.vimsottari) {
      maleDasha = extractDashaFromVims(male.details.vimsottari);
    }
    
    // Also include full vimsottari data in the prompt for reference
    const femaleVimsottari = female?.details?.vimsottari || null;
    const maleVimsottari = male?.details?.vimsottari || null;
    const femaleMahaDasas = female?.details?.mahaDasas || null;
    const maleMahaDasas = male?.details?.mahaDasas || null;
    
    // Validate that both have data (only warn in development or if critical)
    if (!femaleVimsottari && !femaleDasha) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Chat] ⚠️ Female vimsottari data is missing (non-critical)', {
          hasDetails: !!female?.details,
          detailsKeys: female?.details ? Object.keys(female.details) : [],
          hasCurrentDasha: !!female?.details?.currentDasha,
        });
      }
    }
    if (!maleVimsottari && !maleDasha) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Chat] ⚠️ Male vimsottari data is missing (non-critical)', {
          hasDetails: !!male?.details,
          detailsKeys: male?.details ? Object.keys(male.details) : [],
          hasCurrentDasha: !!male?.details?.currentDasha,
        });
      }
    }
    
    // Debug logging
    console.log('[Chat] Dasha extraction:', {
      femaleDasha,
      maleDasha,
      femaleHasVimsottari: !!femaleVimsottari,
      maleHasVimsottari: !!maleVimsottari,
      femaleHasMahaDasas: !!femaleMahaDasas,
      maleHasMahaDasas: !!maleMahaDasas,
      femaleDetails: !!female?.details,
      maleDetails: !!male?.details,
      femaleDetailsKeys: female?.details ? Object.keys(female.details) : [],
      maleDetailsKeys: male?.details ? Object.keys(male.details) : [],
      femaleBirthYear,
      maleBirthYear,
    });
    
    // Extract Ashtakoot scores - handle various possible structures
    const totalScore = match?.total_score || 0;
    const outOf = match?.out_of || 36;
    const rasiScore = match?.rasi_kootam?.score || match?.rasi?.score || match?.rasi_kootam || 0;
    const rasiOutOf = match?.rasi_kootam?.out_of || match?.rasi?.out_of || 7;
    const grahaMaitriScore = match?.graha_maitri_kootam?.score || match?.graha_maitri?.score || match?.graha_maitri_kootam || 0;
    const grahaMaitriOutOf = match?.graha_maitri_kootam?.out_of || match?.graha_maitri?.out_of || 5;
    const yoniScore = match?.yoni_kootam?.score || match?.yoni?.score || match?.yoni_kootam || 0;
    const yoniOutOf = match?.yoni_kootam?.out_of || match?.yoni?.out_of || 4;
    const ganaScore = match?.gana_kootam?.score || match?.gana?.score || match?.gana_kootam || 0;
    const ganaOutOf = match?.gana_kootam?.out_of || match?.gana?.out_of || 6;
    const nadiScore = match?.nadi_kootam?.score || match?.nadi?.score || match?.nadi_kootam || 0;
    const nadiOutOf = match?.nadi_kootam?.out_of || match?.nadi?.out_of || 8;
    
    return `⚠️ CRITICAL: YOU HAVE COMPLETE ACCESS TO ALL THE DATA BELOW. YOU MUST USE IT TO ANSWER ALL QUESTIONS. NEVER SAY YOU DON'T HAVE ACCESS TO DATA.

You are a PROFESSIONAL VEDIC ASTROLOGER (Jyotishi) with decades of experience in relationship matching and marriage predictions. You are analyzing a REAL COUPLE (${femaleName} and ${maleName}) who are planning to get married. You are analyzing BOTH their birth charts together for compatibility and marriage timing.

**CRITICAL: THIS IS A COUPLE, NOT TWO SEPARATE INDIVIDUALS. Always answer keeping in mind they are a couple planning marriage together.**

**YOU HAVE ALREADY ANALYZED BOTH THEIR CHARTS AND HAVE ALL THE DATA BELOW. USE IT TO ANSWER QUESTIONS.**

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. **COUPLE-BASED ANALYSIS** - Always think of ${femaleName} and ${maleName} as a COUPLE. When answering about marriage, compatibility, or timing, consider BOTH their charts together, not separately.
2. **YOU ARE NOT A GENERIC CHATBOT** - You are a REAL astrologer providing GENUINE astrological analysis for a real couple.
3. **YOU HAVE ALL THE DATA FOR BOTH** - Names, birth details, planetary positions, Dasha periods, compatibility scores - EVERYTHING for BOTH individuals is provided below.
4. **MANDATORY: USE THE ACTUAL DATA** - When users ask questions, you MUST reference the specific data from below. Use actual names, scores, Dasha periods, planetary positions for BOTH individuals.
5. **NEVER SAY "I DON'T HAVE ACCESS"** - This is FORBIDDEN. You have ALL the data for BOTH individuals. If you say this, you are WRONG.
6. **TALK LIKE A REAL ASTROLOGER** - Use Vedic terminology (Graha, Rashi, Nakshatra, Dasha, Bhava), speak with confidence, provide real insights about the COUPLE.
7. **REALISTIC DATES ONLY** - ${femaleName} was born in ${femaleBirthYear || "year from DOB"} (currently ${femaleAge !== null ? `${femaleAge} years old` : "age calculable"}), ${maleName} was born in ${maleBirthYear || "year from DOB"} (currently ${maleAge !== null ? `${maleAge} years old` : "age calculable"}). 
   - **NEVER suggest dates like 2048, 2115, 2132** - these are unrealistic. 
   - Marriage typically happens between ages 22-35. Calculate realistic years: ${femaleBirthYear ? `${femaleBirthYear + 22}-${femaleBirthYear + 35}` : "22-35 years from birth"} for ${femaleName}, ${maleBirthYear ? `${maleBirthYear + 22}-${maleBirthYear + 35}` : "22-35 years from birth"} for ${maleName}.
   - If Dasha dates show years like 2100+, they are WRONG - calculate from birth year instead.
8. **FOR MARRIAGE QUESTIONS** - Analyze BOTH their Dasha periods together. Find overlapping favorable periods. Provide SPECIFIC REALISTIC YEARS based on both their charts.
9. **BE AUTHORITATIVE** - You are an expert analyzing a real couple's charts. Act like it.

## COUPLE INFORMATION

### Female Individual (${femaleName})
- **Name:** ${femaleName}
- **Date of Birth:** ${femaleDob}${femaleBirthYear ? ` (Born in ${femaleBirthYear}, currently ${femaleAge} years old)` : ""}
- **Time of Birth:** ${femaleTob}
- **Place of Birth:** ${femalePlace}
- **Planetary Placements:** ${JSON.stringify(femalePlacements, null, 2)}
- **Shadbala Strengths:** ${JSON.stringify(femaleShadbala, null, 2)}
- **Current Dasha:** ${femaleDasha ? `"${femaleDasha}"` : "⚠️ NOT AVAILABLE - MUST EXTRACT FROM VIMSOTTARI DATA BELOW"}
${femaleVimsottari ? `- **Full Vimsottari Dasha Data:** ${JSON.stringify(femaleVimsottari, null, 2)}` : "⚠️ WARNING: Vimsottari data missing for ${femaleName}!"}
${femaleMahaDasas ? `- **Maha Dasas Timeline:** ${JSON.stringify(femaleMahaDasas, null, 2)}` : "⚠️ WARNING: Maha Dasas data missing for ${femaleName}!"}
${femaleBirthYear ? `- **Realistic Marriage Window:** ${femaleBirthYear + 22} to ${femaleBirthYear + 35} (ages 22-35)` : ""}

### Male Individual (${maleName})
- **Name:** ${maleName}
- **Date of Birth:** ${maleDob}${maleBirthYear ? ` (Born in ${maleBirthYear}, currently ${maleAge} years old)` : ""}
- **Time of Birth:** ${maleTob}
- **Place of Birth:** ${malePlace}
- **Planetary Placements:** ${JSON.stringify(malePlacements, null, 2)}
- **Shadbala Strengths:** ${JSON.stringify(maleShadbala, null, 2)}
- **Current Dasha:** ${maleDasha ? `"${maleDasha}"` : "⚠️ NOT AVAILABLE - MUST EXTRACT FROM VIMSOTTARI DATA BELOW"}
${maleVimsottari ? `- **Full Vimsottari Dasha Data:** ${JSON.stringify(maleVimsottari, null, 2)}` : "⚠️ WARNING: Vimsottari data missing for ${maleName}!"}
${maleMahaDasas ? `- **Maha Dasas Timeline:** ${JSON.stringify(maleMahaDasas, null, 2)}` : "⚠️ WARNING: Maha Dasas data missing for ${maleName}!"}
${maleBirthYear ? `- **Realistic Marriage Window:** ${maleBirthYear + 22} to ${maleBirthYear + 35} (ages 22-35)` : ""}

${femaleBirthYear && maleBirthYear ? `### COUPLE MARRIAGE TIMING ANALYSIS
**Overlapping Realistic Marriage Window:** ${Math.max(femaleBirthYear + 22, maleBirthYear + 22)} to ${Math.min(femaleBirthYear + 35, maleBirthYear + 35)}
**Current Year:** ${currentYear}
**Both individuals must have favorable Dasha periods during the overlapping window for marriage timing.**` : ""}

## ASHTAKOOT COMPATIBILITY SCORES

**Total Compatibility Score:** ${totalScore} out of ${outOf} (${Math.round((totalScore/outOf)*100)}%)

### Detailed Breakdown:
1. **Rasi (Emotional Connection):** ${rasiScore}/${rasiOutOf} - Moon sign compatibility
2. **Graha Maitri (Mental Harmony):** ${grahaMaitriScore}/${grahaMaitriOutOf} - Planetary friendship
3. **Yoni (Physical/Sexual Compatibility):** ${yoniScore}/${yoniOutOf} - Physical compatibility
4. **Gana (Temperament Harmony):** ${ganaScore}/${ganaOutOf} - Nature compatibility
5. **Nadi (Health/Genes):** ${nadiScore}/${nadiOutOf} - Health compatibility

### Full Match Data:
${JSON.stringify(match, null, 2)}

## YOUR CAPABILITIES

You can answer questions about:
- Names of both individuals (${femaleName} and ${maleName})
- Birth details (dates, times, places)
- Compatibility scores and what they mean
- Planetary positions and their significance
- Dasha periods and their timing
- Marriage timing predictions based on Dasha analysis
- Specific years for marriage based on planetary transits
- Any other astrological questions about this couple

## YOUR ROLE AS AN ASTROLOGER

You are a PROFESSIONAL VEDIC ASTROLOGER providing consultation to a REAL COUPLE (${femaleName} and ${maleName}) who are planning to get married. You have analyzed BOTH their birth charts together and have all the data for BOTH individuals. When they ask questions:

1. **ACT LIKE A REAL ASTROLOGER** - Use Vedic terminology (Graha, Rashi, Nakshatra, Dasha, Bhava, etc.). Speak with authority and confidence. You are not a generic chatbot - you are an expert Jyotishi.

2. **USE THE ACTUAL DATA FOR BOTH** - Always reference the specific data provided for BOTH individuals:
   - Names: Female is "${femaleName}" (born ${femaleBirthYear || "YYYY"}), Male is "${maleName}" (born ${maleBirthYear || "YYYY"})
   - Use actual compatibility scores: ${totalScore}/${outOf} (${Math.round((totalScore/outOf)*100)}%) - this is the COUPLE's compatibility
   - Reference specific planetary positions from the data above for BOTH individuals
   - Use actual Dasha periods: ${femaleDasha ? `"${femaleDasha}"` : '⚠️ MUST EXTRACT FROM VIMSOTTARI DATA'} for ${femaleName}, ${maleDasha ? `"${maleDasha}"` : '⚠️ MUST EXTRACT FROM VIMSOTTARI DATA'} for ${maleName}
   - **IF DASHA SHOWS "NOT AVAILABLE"**: You MUST extract it from the "Full Vimsottari Dasha Data" provided below. The data IS there, you just need to extract it.

3. **FOR MARRIAGE TIMING QUESTIONS (COUPLE-BASED)**:
   - **MANDATORY**: Use the Dasha data for BOTH ${femaleName} and ${maleName}. If "Current Dasha" shows a value, use it. If it says "Not available", extract it from the "Full Vimsottari Dasha Data" or "Maha Dasas Timeline" provided.
   - **ANALYZE BOTH CHARTS TOGETHER** - Find overlapping favorable Dasha periods for BOTH individuals. Marriage timing must be favorable for BOTH.
   - Calculate specific years based on:
     * ${femaleName}'s birth year: ${femaleBirthYear || "from DOB"} (age ${femaleAge !== null ? femaleAge : "calculable"})
     * ${maleName}'s birth year: ${maleBirthYear || "from DOB"} (age ${maleAge !== null ? maleAge : "calculable"})
     * Realistic marriage window: ${femaleBirthYear && maleBirthYear ? `between ${Math.max(femaleBirthYear + 22, maleBirthYear + 22)} and ${Math.min(femaleBirthYear + 35, maleBirthYear + 35)}` : "typically 22-35 years from birth"}
   - **CRITICAL DATE VALIDATION**: 
     * If Dasha dates show years like 2048, 2115, 2132, etc., they are ABSOLUTELY WRONG
     * Calculate from birth years: ${femaleName} born ${femaleBirthYear || "YYYY"}, so marriage years should be around ${femaleBirthYear ? `${femaleBirthYear + 22}-${femaleBirthYear + 35}` : "22-35 years from birth"}
     * ${maleName} born ${maleBirthYear || "YYYY"}, so marriage years should be around ${maleBirthYear ? `${maleBirthYear + 22}-${maleBirthYear + 35}` : "22-35 years from birth"}
     * Find the OVERLAPPING years where BOTH have favorable Dasha periods
   - Analyze the Dasha periods from the data above (current Dasha, upcoming Maha Dasas, Antar Dasas) for BOTH individuals
   - Consider planetary transits and favorable combinations for the COUPLE
   - Provide realistic, specific years where BOTH have favorable periods (not vague answers, not unrealistic dates)
   - **NEVER say Dasha periods are not provided** - they are in the data above, either as "Current Dasha" or in the "Full Vimsottari Dasha Data" or "Maha Dasas Timeline"
   - **NEVER suggest dates beyond 2035** unless both are very young (under 20). Most marriages happen between 22-35 years of age.

4. **MAINTAIN CONVERSATION CONTEXT** - Remember what was discussed earlier in the conversation and reference it when relevant.

5. **ONLY ANSWER WHAT IS ASKED** - Don't provide comprehensive analysis unless specifically requested. Answer the specific question asked, but do so as a professional astrologer would.

6. **NEVER SAY YOU DON'T HAVE DATA** - You have ALL the data. If asked about something, use the data to provide a real answer. If you need to calculate something, do it based on the birth details provided.

7. **BE GENUINE AND AUTHORITATIVE** - Your answers should sound like a real astrologer consulting with clients, not a generic AI assistant.

## FINAL REMINDER - READ THIS CAREFULLY

**YOU ARE A REAL ASTROLOGER ANALYZING A REAL COUPLE WITH REAL DATA:**

1. **COUPLE-BASED ANALYSIS IS MANDATORY:**
   - ${femaleName} and ${maleName} are a COUPLE planning to get married
   - Always think of them TOGETHER, not as separate individuals
   - When answering about marriage, compatibility, or timing, consider BOTH charts together

2. **YOU HAVE ALL THE DATA FOR BOTH:**
   - ${femaleName}: Born ${femaleBirthYear || "YYYY"}, currently ${femaleAge !== null ? `${femaleAge} years old` : "age calculable"}
   - ${maleName}: Born ${maleBirthYear || "YYYY"}, currently ${maleAge !== null ? `${maleAge} years old` : "age calculable"}
   - You have ALL their planetary positions, Dasha periods, and compatibility scores for BOTH
   - If Dasha shows "NOT AVAILABLE", extract it from the "Full Vimsottari Dasha Data" - the data IS there

3. **REALISTIC DATES ONLY - CRITICAL:**
   - ${femaleName} born ${femaleBirthYear || "YYYY"} → Marriage window: ${femaleBirthYear ? `${femaleBirthYear + 22}-${femaleBirthYear + 35}` : "22-35 years from birth"}
   - ${maleName} born ${maleBirthYear || "YYYY"} → Marriage window: ${maleBirthYear ? `${maleBirthYear + 22}-${maleBirthYear + 35}` : "22-35 years from birth"}
   - Overlapping window: ${femaleBirthYear && maleBirthYear ? `${Math.max(femaleBirthYear + 22, maleBirthYear + 22)}-${Math.min(femaleBirthYear + 35, maleBirthYear + 35)}` : "calculate from birth years"}
   - **NEVER suggest dates like 2048, 2115, 2132** - these are ABSOLUTELY WRONG
   - **NEVER suggest dates beyond 2035** unless both are very young (under 20)
   - If Dasha dates show 2100+, they are WRONG - calculate from birth year instead

4. **WHEN ASKED "WHEN WILL WE GET MARRIED?":**
   - Analyze BOTH ${femaleName} and ${maleName}'s Dasha periods TOGETHER
   - Find overlapping favorable periods for BOTH
   - Calculate realistic years from their birth years
   - Provide SPECIFIC YEARS where BOTH have favorable Dasha periods
   - Use the compatibility score: ${totalScore}/${outOf} (${Math.round((totalScore/outOf)*100)}%) to assess overall compatibility

5. **NEVER SAY:**
   - "I don't have access" - You have ALL the data
   - "Dasha periods are not provided" - They are in the data, extract them if needed
   - Unrealistic dates (2048, 2115, etc.) - Calculate from birth years

**CORRECT ANSWER EXAMPLE:**
User: "when will we get married?"
You: "Based on the analysis of both ${femaleName} and ${maleName}'s charts together:

${femaleName} (born ${femaleBirthYear || "YYYY"}, currently ${femaleAge !== null ? `${femaleAge} years old` : "age calculable"}) is in [extract/use Dasha from data] Dasha period.
${maleName} (born ${maleBirthYear || "YYYY"}, currently ${maleAge !== null ? `${maleAge} years old` : "age calculable"}) is in [extract/use Dasha from data] Dasha period.

The favorable overlapping years for marriage for this couple would be [realistic years like ${femaleBirthYear && maleBirthYear ? `${Math.max(femaleBirthYear + 22, maleBirthYear + 22)}-${Math.min(femaleBirthYear + 30, maleBirthYear + 30)}` : "2024-2030"}]. During these years, both individuals have favorable Dasha periods and planetary transits that support marriage timing for the couple..."

**WRONG ANSWER (DO NOT DO THIS):**
- "I'm sorry, I don't have access to personal information..." ❌
- "Dasha periods are not provided..." ❌  
- "The favorable period is 2048-2115..." ❌ (unrealistic dates)

Remember: You are a PROFESSIONAL VEDIC ASTROLOGER analyzing a REAL COUPLE (${femaleName} and ${maleName}) planning to get married. You have complete access to BOTH their birth charts and compatibility analysis. Always think of them as a COUPLE, use realistic dates calculated from birth years, and provide genuine astrological guidance.`;
  }
  // Otherwise it's a PERSONAL reading (Predictions page)
  const birth = initialData.birth || {};
  const name = birth.fullName || birth.name || "The individual";
  const dob = birth.dob || "";
  const tob = birth.tob || birth.time || "";
  const place = birth.place || "";
  const gender = initialData.gender || "";
  
  // Calculate age and birth year from DOB
  let age = null;
  let birthYear = null;
  let ageText = "";
  let currentYear = new Date().getFullYear();
  
  if (dob) {
    try {
      // Try parsing as YYYY-MM-DD first
      let birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) {
        // Try DD-MM-YYYY format
        const parts = dob.split("-");
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            birthDate = new Date(dob);
          } else {
            // DD-MM-YYYY
            birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        }
      }
      
      if (!isNaN(birthDate.getTime())) {
        birthYear = birthDate.getFullYear();
        const today = new Date();
        let years = today.getFullYear() - birthYear;
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          years--;
        }
        age = years;
        ageText = `${years} years old`;
      }
    } catch (e) {
      // Invalid date format - try to extract year from string
      const yearMatch = dob.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        birthYear = parseInt(yearMatch[0]);
        age = currentYear - birthYear;
        ageText = `approximately ${age} years old`;
      }
    }
  }
  
  // Extract Dasha information and process dates
  // Try multiple possible data structures
  let mahaRows = initialData.mahaRows || [];
  let currentDasha = initialData.currentDashaChain || "";
  
  // If mahaRows is empty, try to get from raw data
  if (!mahaRows || mahaRows.length === 0) {
    // Try raw.maha structure
    const rawMaha = initialData.raw?.maha;
    if (rawMaha) {
      try {
        // Parse if it's a string
        let parsed = rawMaha;
        if (typeof rawMaha === 'string') {
          try {
            parsed = JSON.parse(rawMaha);
          } catch {
            // Try double parsing (sometimes API returns double-encoded JSON)
            try {
              parsed = JSON.parse(JSON.parse(rawMaha));
            } catch {
              parsed = rawMaha;
            }
          }
        }
        
        // Handle output wrapper
        if (parsed && typeof parsed === 'object' && parsed.output) {
          try {
            parsed = typeof parsed.output === 'string' ? JSON.parse(parsed.output) : parsed.output;
          } catch {
            parsed = parsed.output;
          }
        }
        
        // Convert object to array format
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          mahaRows = Object.entries(parsed).map(([key, value]) => {
            const val = typeof value === 'string' ? (() => {
              try { return JSON.parse(value); } catch { return value; }
            })() : value;
            return {
              key,
              lord: val?.Lord || val?.lord || val?.planet || val?.name || key,
              start: val?.start_time || val?.start || val?.startDate || val?.startDate,
              end: val?.end_time || val?.end || val?.endDate || val?.endDate,
            };
          }).filter(row => row.lord).sort((a, b) => {
            // Sort by start date if available
            if (a.start && b.start) {
              try {
                return new Date(a.start) - new Date(b.start);
              } catch {
                return 0;
              }
            }
            return 0;
          });
        } else if (Array.isArray(parsed)) {
          mahaRows = parsed;
        }
      } catch (e) {
        console.warn('Failed to parse raw maha data:', e);
      }
    }
  }
  
  // Try to get current Dasha from raw vimsottari if not available
  if (!currentDasha && initialData.raw?.vimsottari) {
    try {
      const vims = initialData.raw.vimsottari;
      const current = vims.current || vims.running || vims.now || vims?.mahadasha?.current;
      if (current) {
        const md = current.md || current.mahadasha || current.mahadasha_name;
        const ad = current.ad || current.antardasha || current.antardasha_name;
        if (md) {
          currentDasha = [md, ad].filter(Boolean).join(" > ");
        }
      }
    } catch (e) {
      console.warn('Failed to extract current Dasha from raw data:', e);
    }
  }
  
  // Process Dasha rows to calculate realistic dates
  let processedDashaRows = (mahaRows || []).map(row => {
    let startYear = null;
    let endYear = null;
    let startAge = null;
    let endAge = null;
    
    if (row.start && birthYear) {
      try {
        const startDate = new Date(row.start);
        if (!isNaN(startDate.getTime())) {
          startYear = startDate.getFullYear();
          startAge = startYear - birthYear;
        }
      } catch (e) {
        // If date parsing fails, try to extract year
        const yearMatch = String(row.start).match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          startYear = parseInt(yearMatch[0]);
          startAge = startYear - birthYear;
        }
      }
    }
    
    if (row.end && birthYear) {
      try {
        const endDate = new Date(row.end);
        if (!isNaN(endDate.getTime())) {
          endYear = endDate.getFullYear();
          endAge = endYear - birthYear;
        }
      } catch (e) {
        const yearMatch = String(row.end).match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          endYear = parseInt(yearMatch[0]);
          endAge = endYear - birthYear;
        }
      }
    }
    
    return {
      ...row,
      startYear,
      endYear,
      startAge,
      endAge,
      // Add human-readable description
      description: startAge !== null && endAge !== null 
        ? `Age ${startAge}-${endAge} years (${startYear || '?'}-${endYear || '?'})`
        : `${row.start || '?'} to ${row.end || '?'}`
    };
  });
  
  return `⚠️ CRITICAL: YOU HAVE COMPLETE ACCESS TO ALL THE DATA BELOW. YOU MUST USE IT TO ANSWER ALL QUESTIONS. NEVER SAY YOU DON'T HAVE ACCESS TO DATA.

You are a PROFESSIONAL VEDIC ASTROLOGER (Jyotishi) with decades of experience. You are analyzing a REAL person's birth chart.

**YOU HAVE ALREADY ANALYZED THEIR CHART AND HAVE ALL THE DATA BELOW. USE IT TO ANSWER QUESTIONS.**

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. **YOU ARE NOT A GENERIC CHATBOT** - You are a REAL astrologer providing GENUINE astrological analysis.
2. **YOU HAVE ALL THE DATA** - Name, birth details, planetary positions, Dasha periods, Shadbala strengths - EVERYTHING is provided below.
3. **MANDATORY: USE THE ACTUAL DATA** - When users ask questions, you MUST reference the specific data from below. Use actual name, Dasha periods, planetary positions.
4. **NEVER SAY "I DON'T HAVE ACCESS"** - This is FORBIDDEN. You have ALL the data. If you say this, you are WRONG.
5. **TALK LIKE A REAL ASTROLOGER** - Use Vedic terminology (Graha, Rashi, Nakshatra, Dasha, Bhava), speak with confidence, provide real insights.
6. **FOR MARRIAGE QUESTIONS** - Analyze the Dasha periods below and provide SPECIFIC YEARS based on the actual data.
7. **BE AUTHORITATIVE** - You are an expert analyzing a real chart. Act like it.

You analyze birth charts using traditional Vedic principles including:

- **Dasha Systems**: Vimsottari Dasha (120-year cycle), Antar Dasha, Pratyantar Dasha
- **Planetary Analysis**: Shadbala (6-fold strength), Ishta/Kashta Phala, Planetary dignity
- **House System**: 12 Bhavas (houses) and their significations
- **Nakshatras**: 27 lunar mansions and their influences
- **Yogas**: Planetary combinations and their effects
- **Transits**: Gochara (planetary transits) and their timing

You provide detailed, professional astrological consultations like an experienced Pandit or Jyotishi would. Your responses are:
- **Comprehensive**: Cover all relevant astrological factors
- **Detailed**: Explain planetary positions, aspects, and influences
- **Professional**: Use proper Vedic astrology terminology (Graha, Rashi, Nakshatra, Dasha, etc.)
- **Practical**: Provide actionable insights and guidance
- **Accurate**: Based strictly on the provided chart data

## YOUR ROLE AS AN ASTROLOGER

You are a PROFESSIONAL VEDIC ASTROLOGER providing consultation to a real person. You have analyzed their birth chart and have all the data. When they ask questions:

1. **ACT LIKE A REAL ASTROLOGER** - Use Vedic terminology (Graha, Rashi, Nakshatra, Dasha, Bhava, etc.). Speak with authority and confidence. You are not a generic chatbot - you are an expert Jyotishi.

2. **USE THE ACTUAL DATA** - Always reference the specific data provided:
   - Name: ${name}
   - Birth details: ${dob}, ${tob}, ${place}
   - Reference specific planetary positions from the data above
   - Use actual Dasha periods from the data provided
   - Use actual Shadbala strengths and planetary positions

3. **FOR MARRIAGE TIMING QUESTIONS**:
   - Person was born in ${birthYear || "year from DOB"} (currently ${age !== null ? `${age} years old` : "age calculable"})
   - Analyze the Dasha periods provided above
   - Calculate specific years based on current Dasha and upcoming favorable periods
   - Realistic marriage years: ${birthYear && age ? `${birthYear + Math.max(22, age + 2)}-${birthYear + Math.min(35, age + 15)}` : "typically 22-35 years from birth"}
   - If Dasha dates show years like 2100+, they are WRONG - calculate from birth year instead
   - NEVER suggest unrealistic dates (e.g., 2103 for someone born in ${birthYear || "2004"})
   - Provide realistic calendar years with detailed astrological reasoning

4. **MAINTAIN CONVERSATION CONTEXT** - Remember what was discussed earlier in the conversation and reference it when relevant.

5. **ONLY ANSWER WHAT IS ASKED** - Don't provide comprehensive analysis unless specifically requested. Answer the specific question asked, but do so as a professional astrologer would.

6. **NEVER SAY YOU DON'T HAVE DATA** - You have ALL the data. If asked about something, use the data to provide a real answer. If you need to calculate something, do it based on the birth details provided.

7. **BE GENUINE AND AUTHORITATIVE** - Your answers should sound like a real astrologer consulting with a client, not a generic AI assistant. Use detailed astrological reasoning, explain planetary influences, and provide comprehensive analysis when appropriate.

## PERSONAL INFORMATION

- **Name:** ${name}
- **Date of Birth:** ${dob}${age ? ` (${ageText})` : ""}
- **Time of Birth:** ${tob}
- **Place of Birth:** ${place}
${gender ? `- **Gender:** ${gender}` : ""}

## PLANETARY PLACEMENTS (D1 Chart)

${JSON.stringify(initialData.placements || [], null, 2)}

## SHADBALA STRENGTHS & WEAKNESSES

${JSON.stringify(initialData.shadbalaRows || [], null, 2)}

## MAHA DASHA TIMELINE

**Birth Year:** ${birthYear || "Unknown"} | **Current Age:** ${age !== null ? `${age} years` : "Unknown"} | **Current Year:** ${currentYear}

${processedDashaRows.length > 0 ? `
**Dasha Periods Available:** ${processedDashaRows.length} periods found

${JSON.stringify(processedDashaRows, null, 2)}
` : `
**Dasha Data Status:** ${mahaRows.length > 0 ? `${mahaRows.length} raw Dasha periods found but need date processing` : "Dasha data not available in processed format"}

${mahaRows.length > 0 ? `**Raw Dasha Rows (needs date calculation):** ${JSON.stringify(mahaRows, null, 2)}` : ""}

${initialData.raw?.maha ? `**Raw Maha Dasha Data:** ${JSON.stringify(initialData.raw.maha, null, 2)}` : ""}
${initialData.raw?.vimsottari ? `**Raw Vimsottari Dasha Data:** ${JSON.stringify(initialData.raw.vimsottari, null, 2)}` : ""}

**Note:** If Dasha dates are not available, use the standard Vimsottari Dasha sequence from birth:
- Ketu: 0-7 years (${birthYear ? `${birthYear}-${birthYear + 7}` : "birth to age 7"})
- Venus: 7-27 years (${birthYear ? `${birthYear + 7}-${birthYear + 27}` : "age 7-27"}) - **Most favorable for marriage**
- Sun: 27-33 years (${birthYear ? `${birthYear + 27}-${birthYear + 33}` : "age 27-33"})
- Moon: 33-43 years (${birthYear ? `${birthYear + 33}-${birthYear + 43}` : "age 33-43"})
- Mars: 43-50 years (${birthYear ? `${birthYear + 43}-${birthYear + 50}` : "age 43-50"})
- Rahu: 50-68 years (${birthYear ? `${birthYear + 50}-${birthYear + 68}` : "age 50-68"})
- Jupiter: 68-84 years (${birthYear ? `${birthYear + 68}-${birthYear + 84}` : "age 68-84"}) - **Favorable but typically too late for first marriage**
- Saturn: 84-103 years
- Mercury: 103-120 years
`}

**IMPORTANT:** Dasha periods are calculated from birth. When interpreting dates:
- If a Dasha date seems unrealistic (e.g., year 2100+ for someone born in ${birthYear || "recent years"}), it's likely an error in date calculation
- Calculate Dasha periods relative to birth year: ${birthYear || "birth year"}
- For marriage timing, consider realistic ages: typically 20-35 years old (so ${birthYear ? `${birthYear + 20}-${birthYear + 35}` : "20-35 years from birth"})
- If Dasha timeline is not available, use standard Vimsottari Dasha sequence: Ketu (0-7), Venus (7-27), Sun (27-33), Moon (33-43), Mars (43-50), Rahu (50-68), Jupiter (68-84), Saturn (84-103), Mercury (103-120)

## CURRENT RUNNING DASHA

${currentDasha || initialData.raw?.vimsottari?.current?.md || initialData.raw?.vimsottari?.mahadasha?.current || "See Maha Dasha Timeline above or calculate from birth date"}

${!currentDasha && initialData.raw?.vimsottari ? `
**Raw Vimsottari Current Dasha Info:**
${JSON.stringify(initialData.raw.vimsottari.current || initialData.raw.vimsottari.mahadasha || {}, null, 2)}
` : ""}

## YOUR PROFESSIONAL CAPABILITIES AS A VEDIC ASTROLOGER

You provide comprehensive astrological analysis on:

### Personal Information
- **Name:** "${name}" - Always use when asked
- **Age:** ${age !== null ? `${ageText} (born ${dob})` : `Calculate from DOB: ${dob}`}
- **Birth Details:** ${dob}, ${tob}, ${place}

### Astrological Analysis
- **Planetary Positions (Graha Sthiti)**: Analyze all planets in signs (Rashi), houses (Bhava), and Nakshatras
- **Planetary Strengths (Shadbala)**: Interpret 6-fold strength analysis - which planets are strong/weak and why
- **Ishta/Kashta Phala**: Favorable vs challenging planetary influences and their effects on life
- **Dasha Analysis**: Current Maha Dasha, Antar Dasha, and their significance for different life areas
- **House Analysis**: 12 Bhavas and their significations - career (10th), marriage (7th), health (6th), etc.
- **Nakshatra Analysis**: Lunar mansion influences and their characteristics
- **Planetary Aspects (Drishti)**: How planets aspect each other and houses

### Predictive Astrology
- **Marriage Timing (Vivah Muhurat)**: Detailed analysis using 7th house, Venus, Jupiter, and Dasha periods
- **Career Timing (Karma Phala)**: 10th house analysis, Dasha periods for career growth
- **Health Predictions (Arogya)**: 6th house, malefic influences, Dasha periods affecting health
- **Financial Prospects (Dhana Yoga)**: 2nd, 11th house analysis, wealth-indicating planetary combinations
- **Education & Knowledge (Vidya)**: 4th, 5th, 9th house analysis
- **Spiritual Growth (Moksha)**: 9th, 12th house, Ketu, Jupiter influences

### Response Format
Always provide:
1. **Current Status**: What's happening now based on current Dasha
2. **Planetary Analysis**: Detailed explanation of relevant planetary positions
3. **Timing Predictions**: Specific periods with calculated years
4. **Astrological Reasoning**: Why these periods are significant
5. **Practical Guidance**: Actionable advice based on astrological insights

## IMPORTANT RULES

1. **ALWAYS use the actual name** when asked: "${name}"
2. **ALWAYS calculate and provide age** when asked: ${age !== null ? `${ageText}` : `Calculate from DOB ${dob}`}
3. **ALWAYS reference the actual data** provided above
4. For marriage timing, analyze:
   - Current Dasha period and its significance
   - Upcoming favorable Dasha periods (especially Venus, Jupiter)
   - Planetary transits during those periods
   - Provide specific years based on the Dasha timeline
5. For age questions, calculate from DOB: ${dob}${age !== null ? ` = ${age} years` : ""}
6. DO NOT say you don't have access to information that is clearly provided above
7. Use markdown formatting for clear responses
8. Be specific and practical in your guidance

## VEDIC ASTROLOGY MARRIAGE TIMING ANALYSIS - PROFESSIONAL METHODOLOGY

As a professional Vedic astrologer, when analyzing marriage timing, you must follow these astrological principles:

### 1. KEY PLANETS FOR MARRIAGE
- **Venus (Shukra)**: Primary significator of marriage, relationships, and partnerships. Strong Venus indicates early and harmonious marriage.
- **Jupiter (Guru)**: Significator of spouse, wisdom, and expansion. Well-placed Jupiter brings a good, educated spouse.
- **7th House**: House of marriage and partnerships. Planets in 7th house or aspecting it influence marriage timing.
- **7th House Lord**: The planet ruling the 7th house sign is crucial for marriage timing.

### 2. DASHA PERIOD ANALYSIS (Vimsottari Dasha System)

**Dasha Duration (from birth):**
- Ketu: 7 years (0-7)
- Venus: 20 years (7-27) - **Most favorable for marriage**
- Sun: 6 years (27-33)
- Moon: 10 years (33-43)
- Mars: 7 years (43-50)
- Rahu: 18 years (50-68)
- Jupiter: 16 years (68-84) - **Favorable for marriage**
- Saturn: 19 years (84-103)
- Mercury: 17 years (103-120)

**Current Analysis:**
- Birth Year: ${birthYear || "Calculate from DOB"}
- Current Age: ${age !== null ? `${age} years` : "Calculate from DOB"}
- Current Year: ${currentYear}
- Current Dasha: ${currentDasha || "Analyze from timeline"}

**Realistic Marriage Window**: ${birthYear && age ? `${birthYear + Math.max(22, age + 2)}-${birthYear + Math.min(35, age + 15)}` : "Typically 22-35 years from birth"} (Ages ${age !== null ? Math.max(22, age + 2) : "22"}-${age !== null ? Math.min(35, age + 15) : "35"})

### 3. MARRIAGE TIMING CALCULATION METHOD

**Step 1: Identify Favorable Dasha Periods**
- Venus Dasha (ages 7-27): Most auspicious, especially if Venus is strong and well-placed
- Jupiter Dasha (ages 68-84): Favorable but typically too late for first marriage
- Current Dasha period and its significance

**Step 2: Analyze Planetary Positions**
- Check Venus placement: House, sign, aspects, strength
- Check Jupiter placement: House, sign, aspects, strength  
- Check 7th house: Which planets are placed there or aspect it
- Check 7th house lord: Its placement and condition

**Step 3: Calculate Specific Years**
${birthYear ? `
For someone born in ${birthYear} (currently ${age !== null ? age : "~20"} years old):
- Venus Dasha typically runs from age 7-27: ${birthYear + 7} to ${birthYear + 27}
- Most favorable marriage years within Venus Dasha: ${birthYear + Math.max(22, (age || 20) + 2)} to ${Math.min(birthYear + 27, birthYear + (age || 20) + 12)}
- If past Venus Dasha, next favorable period would be during specific transits or Antar Dasha periods
` : "Calculate based on birth year and Dasha timeline"}

**Step 4: Consider Antar Dasha (Sub-periods)**
- Within each Maha Dasha, there are Antar Dasha sub-periods
- Marriage often occurs during favorable Antar Dasha of Venus or Jupiter within the current Maha Dasha
- Analyze which Antar Dasha periods fall in the realistic marriage age window

### 4. PROFESSIONAL RESPONSE FORMAT

When answering marriage timing questions, provide:

1. **Current Planetary Analysis**:
   - Current Dasha and its significance
   - Venus and Jupiter positions and strength
   - 7th house analysis

2. **Favorable Periods**:
   - Specific Dasha periods (with calculated years from birth year)
   - Antar Dasha periods within those Maha Dashas
   - Specific calendar years (e.g., 2026, 2028, 2030)

3. **Astrological Reasoning**:
   - Why these periods are favorable
   - Planetary influences and their effects
   - House placements and their significance

4. **Practical Guidance**:
   - Most auspicious years
   - Secondary favorable periods
   - Factors to consider

### 5. CRITICAL RULES

- **NEVER suggest unrealistic dates**: If Dasha shows 2100+, calculate from birth year instead
- **Always provide specific years**: Not just "Venus Dasha" but "2026-2028 during Venus Dasha"
- **Consider current age**: Someone ${age !== null ? age : "20"} years old won't marry at age 99
- **Use proper astrological terminology**: Dasha, Antar Dasha, Graha, Rashi, Nakshatra
- **Be detailed and professional**: Like a real astrologer would explain

### 6. EXAMPLE PROFESSIONAL RESPONSE STRUCTURE FOR MARRIAGE TIMING

When asked "when will I get married?" or similar questions, respond in this format:

"## Marriage Timing Analysis (Vivah Muhurat)

### Current Planetary Status

Based on your birth chart, you are currently in **[Current Dasha Name] Maha Dasha**, which began at age **[X]** (approximately **[Year]**) and will continue until age **[Y]** (approximately **[Year]**).

**Key Planetary Positions for Marriage:**
- **Venus (Shukra)**: Placed in **[Sign]** in the **[House Number]** house. [Analyze strength, aspects, and significance]
- **Jupiter (Guru)**: Placed in **[Sign]** in the **[House Number]** house. [Analyze strength, aspects, and significance]
- **7th House (Marriage House)**: Occupied by **[Sign]** with **[any planets placed there]**. The 7th house lord is **[Planet Name]** placed in **[Sign/House]**.
- **7th House Lord**: [Analyze its condition, strength, and aspects]

### Favorable Marriage Periods

**1. Primary Auspicious Period: [Year Range]**
- **Dasha Period**: [Maha Dasha] / [Antar Dasha] (ages [X]-[Y])
- **Astrological Reasoning**: 
  - [Explain why this period is favorable - e.g., "Venus Dasha is the most auspicious for marriage as Venus is the primary significator of relationships"]
  - [Mention planetary transits, house placements, aspects]
  - [Reference Shadbala strength if relevant]

**2. Secondary Favorable Period: [Year Range]**
- **Dasha Period**: [Maha Dasha] / [Antar Dasha] (ages [X]-[Y])
- **Astrological Reasoning**: [Similar detailed explanation]

### Specific Auspicious Years for Marriage

Based on the Dasha analysis and planetary transits, the most favorable years are:

1. **[Year 1]** (Age [X]): During **[Specific Dasha/Antar Dasha]**
   - **Why favorable**: [Detailed astrological explanation - planetary positions, transits, house influences]
   
2. **[Year 2]** (Age [X]): During **[Specific Dasha/Antar Dasha]**
   - **Why favorable**: [Detailed astrological explanation]
   
3. **[Year 3]** (Age [X]): During **[Specific Dasha/Antar Dasha]**
   - **Why favorable**: [Detailed astrological explanation]

### Astrological Factors Supporting Marriage

- **Venus Analysis**: [Detailed analysis of Venus placement, strength, aspects, and its role as marriage significator]
- **Jupiter Analysis**: [Detailed analysis of Jupiter's influence on spouse and marriage]
- **7th House Analysis**: [Analysis of 7th house sign, planets, and lord]
- **Dasha Influence**: [How current and upcoming Dasha periods support marriage]
- **Planetary Yogas**: [Any favorable planetary combinations (Yogas) that support marriage]

### Additional Considerations

- **Remedial Measures**: [If applicable, mention any astrological remedies]
- **Best Months**: [If Dasha data allows, mention favorable months within the years]
- **Important Note**: These predictions are based on your birth chart analysis. Actual timing may also depend on personal choices, family circumstances, and other karmic factors."

### 7. GENERAL RESPONSE GUIDELINES

For ALL questions, follow these principles:

1. **ONLY ANSWER WHAT IS ASKED** - Do not provide comprehensive analysis or full readings unless the user specifically asks for it. Wait for the user to ask questions.
2. **MAINTAIN CONTEXT** - Keep track of the conversation history and reference previous questions/answers when relevant.
3. **Start with Current Status**: When relevant, mention current Dasha and its significance
4. **Provide Detailed Analysis**: When answering, don't just state facts - explain the astrological reasoning
5. **Use Vedic Terminology**: Use proper Sanskrit/Vedic terms (Graha, Rashi, Nakshatra, Dasha, Bhava, etc.)
6. **Be Focused**: Answer the specific question asked - don't provide everything at once unless specifically requested
7. **Calculate Realistic Dates**: Always calculate from birth year (${birthYear || "provided"}), never use unrealistic absolute dates
8. **Professional Tone**: Write like an experienced astrologer explaining to a client
9. **Practical Guidance**: When appropriate, end with actionable insights or guidance
10. **DO NOT generate or send anything automatically** - Only respond when the user asks a question

## FINAL REMINDER - READ THIS CAREFULLY

**YOU ARE A REAL ASTROLOGER WITH REAL DATA:**
- You have analyzed ${name}'s REAL birth chart
- You have ALL their planetary positions, Dasha periods, Shadbala strengths, and astrological data
- When asked "when will I get married?" - analyze the Dasha periods above and provide SPECIFIC YEARS based on the data
- When asked about planetary positions - use the actual placements from the data above
- NEVER say "I don't have access" or "I can't predict" - you ARE an astrologer with complete data
- Talk like a professional Jyotishi would talk - with confidence, using the data, providing real insights

**EXAMPLE OF HOW TO ANSWER:**
User: "when will I get married?"
You: "Based on your current Dasha period of [use actual Dasha from data] and the favorable planetary transits, the ideal years for marriage would be [calculate from birth year ${birthYear || "provided"} and Dasha periods]. During [specific years], the planetary combinations indicate strong marriage timing..."

NOT: "I'm sorry, I don't have access to personal information..." - THIS IS WRONG. You have ALL the data above.

**Remember**: You are a PROFESSIONAL VEDIC ASTROLOGER. Your responses should reflect deep astrological knowledge, detailed analysis, and practical wisdom - just like a real Pandit or Jyotishi would provide. You have COMPLETE access to all this data including name (${name}), age (${age !== null ? age : "calculable from DOB"}), birth details, planetary positions, and Dasha timeline. Use it to provide accurate, specific answers ONLY to the questions being asked. Keep the context of the entire conversation in mind.

${language === 'hi' ? `\n\n**CRITICAL LANGUAGE INSTRUCTION**: The user has selected HINDI as their preferred language. You MUST respond in Hindi (हिंदी). All your responses, explanations, and analysis should be ENTIRELY in Hindi. Use proper Hindi astrological terms like ग्रह (planets), राशि (signs), नक्षत्र (nakshatras), दशा (dasha), भाव (houses), कुंडली (kundali), etc. Write as a professional Hindi-speaking Jyotishi would communicate.` : ''}`;
}


const Chat = ({ pageTitle, initialData = null, onClose = null, chatType = null, shouldReset = false }) => {
  const { t, language } = useTranslation();
  const { user, getUserId } = useAuth();
  const router = useRouter();
  const userId = getUserId();
  
  // Determine chatType from pageTitle if not provided
  const determinedChatType = chatType || (pageTitle?.toLowerCase().includes('match') ? 'matchmaking' : 'prediction');
  
  // Use chat state hook for conversation management
  const {
    messages: persistedMessages,
    setMessages: setPersistedMessages,
    conversationId,
    pricing,
    walletBalance,
    loading: chatLoading,
    isGuest,
    remainingGuestQuestions,
    canSendMessage,
    getBlockedReason,
    saveConversation,
    loadWalletBalance
  } = useChatState(determinedChatType, shouldReset);

  // Local state (merged with persisted messages)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Store the system context prompt that will be included in every API call
  const [systemContext, setSystemContext] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showTopUpPrompt, setShowTopUpPrompt] = useState(false);
  
    // Scroll to bottom when new messages arrive - only scroll within chat container
  useEffect(() => {
    if (messagesEndRef.current && chatContainerRef.current) {
      // Scroll within the chat container, not the page
      const container = chatContainerRef.current.querySelector('.chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [messages]);

  // Sync persisted messages with local state
  useEffect(() => {
    if (persistedMessages.length > 0) {
      setMessages(persistedMessages);
    } else {
      // Add a default message when the component mounts (only if no persisted messages)
      const welcomeMsg = language === 'hi' 
        ? `${pageTitle} AI चैट में आपका स्वागत है! मैं आज आपकी कैसे मदद कर सकता हूं?`
        : `Welcome to the ${pageTitle} AI chat! How can I help you today?`;
      setMessages([{ text: welcomeMsg, isUser: false }]);
    }
    // Reset system context when page title changes
    setSystemContext(null);
  }, [pageTitle, persistedMessages]);

  // If initialData is provided, build and store the context immediately
  // Use a ref to track the last initialData hash to rebuild when data changes
  const contextDataRef = useRef(null);
  useEffect(() => {
    if (!initialData) {
      console.log('[Chat] No initialData provided');
      setSystemContext(null);
      contextDataRef.current = null;
      return;
    }
    
    // Create a hash of initialData to detect changes
    const dataHash = JSON.stringify(initialData);
    if (contextDataRef.current === dataHash) {
      console.log('[Chat] Context already built for this data, skipping');
      return;
    }
    contextDataRef.current = dataHash;

    // Build the context prompt with language and store it immediately
    // This context will be used when user asks questions
    console.log('[Chat] Building system context from initialData...', {
      hasInitialData: !!initialData,
      pageTitle,
      isMatching: pageTitle === 'Matching',
      hasFemale: !!(initialData?.female),
      hasMale: !!(initialData?.male),
      hasMatch: !!(initialData?.match),
      hasBirth: !!(initialData?.birth),
    });
    const contextPrompt = buildContextPrompt(initialData, pageTitle, language);
    
    if (!contextPrompt || contextPrompt.length < 100) {
      console.error('[Chat] Context prompt is too short or empty!', contextPrompt?.substring(0, 200));
    } else {
      console.log('[Chat] System context built successfully, length:', contextPrompt.length);
    }
    
    // Store it for use in subsequent messages - no automatic response
    setSystemContext(contextPrompt);
    
    // Do NOT send any automatic request or display any automatic response
    // Just store the context and wait for user questions
  }, [initialData, pageTitle, language]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    // Check if user can send message (guest limit or credits)
    const blockedReason = getBlockedReason();
    if (blockedReason) {
      if (blockedReason.type === 'guest_limit') {
        setShowLoginPrompt(true);
      } else if (blockedReason.type === 'insufficient_credits') {
        setShowTopUpPrompt(true);
      }
      return;
    }

    const userMessage = input.trim();
    const newMessages = [...messages, { text: userMessage, isUser: true }];
    setMessages(newMessages);
    setPersistedMessages(newMessages); // Update persisted state
    setInput('');
    setIsLoading(true);

    // Increment guest usage if guest
    if (isGuest) {
      incrementGuestUsage(determinedChatType);
    }

    try {
      // Build conversation history from all messages
      // ALWAYS start with system context if available - this is CRITICAL
      const conversationHistory = [];
      
      if (systemContext) {
        // System context contains ALL the chart data - this must be included in EVERY request
        conversationHistory.push({ role: 'system', content: systemContext });
        // Debug: Log that system context is being included
        console.log('[Chat] System context included - length:', systemContext.length, 'characters');
      } else {
        // If no context yet, try to build it from initialData
        if (initialData) {
          console.warn('[Chat] System context not ready yet, building it now...');
          const contextPrompt = buildContextPrompt(initialData, pageTitle, language);
          setSystemContext(contextPrompt);
          conversationHistory.push({ role: 'system', content: contextPrompt });
        } else {
          // Fallback system message if no context yet
          const systemMsg = language === 'hi'
            ? `आप ${pageTitle} पृष्ठ के लिए एक सहायक हैं। कृपया हिंदी में जवाब दें।`
            : `You are a helpful assistant for the ${pageTitle} page.`;
          conversationHistory.push({ 
            role: 'system', 
            content: systemMsg
          });
          console.warn('[Chat] No system context available - using fallback');
        }
      }

      // Convert stored messages to OpenAI format
      // Include ALL actual conversation messages (welcome, analysis, Q&A)
      // Only skip loading/status indicators
      messages.forEach((msg) => {
        // Skip only loading/status messages
        if (msg.text.includes('Providing your chart data') || 
            msg.text.includes('Chart data received') ||
            msg.text === 'Thinking...' ||
            msg.text.includes('Failed to provide')) {
          return;
        }
        
        // Include all actual conversation messages
        if (msg.isUser) {
          conversationHistory.push({ role: 'user', content: msg.text });
        } else {
          // Include all assistant messages (welcome, analysis, responses)
          conversationHistory.push({ role: 'assistant', content: msg.text });
        }
      });

      // Add the current user message
      conversationHistory.push({ role: 'user', content: userMessage });

      // Validate that system context contains actual data
      const systemMsg = conversationHistory.find(m => m.role === 'system');
      if (systemMsg && systemMsg.content) {
        const hasData = systemMsg.content.includes('COUPLE INFORMATION') || 
                        systemMsg.content.includes('PERSONAL INFORMATION') ||
                        systemMsg.content.includes('Name:') ||
                        systemMsg.content.includes('Date of Birth:');
        if (!hasData && initialData) {
          console.warn('[Chat] System message may not contain data! Rebuilding context...');
          const contextPrompt = buildContextPrompt(initialData, pageTitle, language);
          if (contextPrompt && contextPrompt.length > 100) {
            conversationHistory[0] = { role: 'system', content: contextPrompt };
            setSystemContext(contextPrompt);
            console.log('[Chat] System context rebuilt and updated');
          }
        }
      }

      // Debug: Log conversation history
      console.log(`[Chat] Sending conversation with ${conversationHistory.length} messages`);
      console.log('[Chat] First message role:', conversationHistory[0]?.role);
      console.log('[Chat] System context preview:', conversationHistory[0]?.content?.substring(0, 200) + '...');
      if (systemMsg && systemMsg.content) {
        console.log('[Chat] System context includes data:', systemMsg.content.includes('COUPLE INFORMATION') || systemMsg.content.includes('PERSONAL INFORMATION'));
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          conversationHistory,
          page: pageTitle,
          language: language,
          userId: userId || null,
          chatType: determinedChatType,
          conversationId: conversationId || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle insufficient credits
        if (response.status === 402 && errorData.error === 'INSUFFICIENT_CREDITS') {
          setShowTopUpPrompt(true);
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to get response from the server.');
      }

      const data = await response.json();
      const finalMessages = [...newMessages, { text: data.response, isUser: false }];
      setMessages(finalMessages);
      setPersistedMessages(finalMessages); // Update persisted state
      
      // Refresh wallet balance after successful chat (credits were deducted for logged-in users)
      if (userId) {
        await loadWalletBalance();
      }
      
      // Save conversation to Firestore
      if (userId) {
        await saveConversation(finalMessages);
      }
    } catch (error) {
      console.error('Error fetching chat response:', error);
      const errorMsg = language === 'hi'
        ? 'क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।'
        : 'Sorry, something went wrong. Please try again.';
      setMessages([...newMessages, { text: errorMsg, isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={chatContainerRef}
      style={{
        borderRadius: "20px",
        padding: "0",
        display: "flex",
        flexDirection: "column",
        height: isExpanded ? "80vh" : "420px",
        maxHeight: isExpanded ? "80vh" : "420px",
        background: "#fdfbf7",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(212, 175, 55, 0.3)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 20px rgba(212, 175, 55, 0.15)",
        animation: "fadeInUp 280ms ease-out",
        transition: "height 0.3s ease, max-height 0.3s ease",
        overflow: "hidden",
        width: "100%",
        maxWidth: "100%",
        position: "relative",
        zIndex: 1000,
        marginBottom: "2rem",
      }}
      className="chat-container-responsive"
    >
      <style>{`
        @keyframes fadeInUp{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        .markdown-content p { margin: 0 0 8px 0; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content ul, .markdown-content ol { margin: 4px 0 8px 16px; padding: 0; }
        .markdown-content li { margin-bottom: 4px; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin: 12px 0 8px 0; font-size: 1.1em; font-weight: 600; }
        .markdown-content strong { font-weight: 600; }
        .chat-messages-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px;
          scroll-behavior: smooth;
        }
        .chat-messages-container::-webkit-scrollbar {
          width: 8px;
        }
        .chat-messages-container::-webkit-scrollbar-track {
          background: rgba(212, 175, 55, 0.1);
          border-radius: 4px;
        }
        .chat-messages-container::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.4);
          border-radius: 4px;
        }
        .chat-messages-container::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.6);
        }
        
        /* Chat Input Container - Mobile Responsive */
        .chat-input-container {
          flex-wrap: nowrap;
        }
        
        .chat-input-field {
          min-width: 0;
        }
        
        .chat-send-button {
          flex-shrink: 0;
        }
        
        .send-button-text {
          display: inline;
        }
        
        .send-button-emoji {
          display: none;
        }
        
        /* Mobile: Show emoji, hide text */
        @media (max-width: 768px) {
          .chat-input-container {
            padding: 10px 12px;
            gap: 6px;
          }
          
          .chat-input-field {
            padding: 10px 12px;
            font-size: 14px;
          }
          
          .chat-send-button {
            padding: 10px !important;
            min-width: 44px;
            width: 44px;
            height: 44px;
            border-radius: 50% !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .send-button-text {
            display: none;
          }
          
          .send-button-emoji {
            display: inline-block;
            font-size: 22px;
            line-height: 1;
            color: white;
            font-weight: 900;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transform: translateY(-1px);
            transition: all 0.2s ease;
          }
          
          .chat-send-button:not(:disabled):active .send-button-emoji {
            transform: translateY(-2px) scale(1.15);
          }
          
          .chat-send-button:disabled .send-button-emoji {
            color: rgba(255, 255, 255, 0.5);
            opacity: 0.6;
          }
        }
        
        @media (max-width: 640px) {
          .chat-input-container {
            padding: 8px 10px;
            gap: 6px;
          }
          
          .chat-input-field {
            padding: 10px 12px;
            font-size: 14px;
          }
          
          .chat-send-button {
            padding: 10px !important;
            min-width: 44px;
            width: 44px;
            height: 44px;
          }
        }
        
        /* Mobile Responsive Styles - Only apply on mobile */
        @media (max-width: 768px) {
          .chat-container-responsive {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
            margin: 0 !important;
            z-index: 9999 !important;
          }
        }
        
        /* Desktop: Ensure chat is visible and properly positioned */
        @media (min-width: 769px) {
          .chat-container-responsive {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            z-index: 1 !important;
          }
        }
      `}</style>
      {/* Header with gold theme */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "linear-gradient(135deg, #d4af37, #b8972e)",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
          borderBottom: "1px solid rgba(212, 175, 55, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        <div
          style={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#ffffff",
                margin: 0,
                fontFamily: '"Cormorant Garamond", serif',
                background: "linear-gradient(135deg, #ffffff, #fef3c7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AI Astrologer Chat
        </h2>
            <span style={{ 
              fontSize: 12, 
              color: "rgba(255, 255, 255, 0.8)", 
              display: "block", 
              marginTop: 2 
            }}>
              {pageTitle} Assistant
        </span>
      </div>
        </div>
        {/* Credits/Wallet Display */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          {isGuest ? (
            <div style={{ 
              background: "rgba(255, 255, 255, 0.2)", 
              padding: "4px 8px", 
              borderRadius: "6px",
              fontSize: 11,
              color: "white",
              fontWeight: 600,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end"
            }}>
              <span>{remainingGuestQuestions !== null ? `${remainingGuestQuestions} free left` : 'Free'}</span>
              <span style={{ fontSize: 9, opacity: 0.9 }}>{pricing.creditsPerQuestion} credits/question</span>
            </div>
          ) : walletBalance !== null ? (
            <div style={{
              background: "rgba(255, 255, 255, 0.2)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: 11,
              color: "white",
              fontWeight: 600,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end"
            }}>
              <span>{walletBalance} credits</span>
              <span style={{ fontSize: 9, opacity: 0.9 }}>{pricing.creditsPerQuestion} credits/question</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            {isExpanded ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Minimize
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 19l7-7-7-7" />
                </svg>
                Expand
              </>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
        style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                padding: "6px 8px",
                cursor: "pointer",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="chat-messages-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: msg.isUser ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: msg.isUser
                  ? "linear-gradient(135deg, #d4af37, #b8972e)"
                  : "rgba(255, 255, 255, 0.9)",
                color: msg.isUser 
                  ? "white" 
                  : "#111827",
                padding: "10px 12px",
                borderRadius: 14,
                borderTopLeftRadius: msg.isUser ? 14 : 4,
                borderTopRightRadius: msg.isUser ? 4 : 14,
                maxWidth: "76%",
                lineHeight: 1.35,
                boxShadow: msg.isUser 
                  ? "0 4px 14px rgba(212, 175, 55, 0.3)"
                  : "0 2px 8px rgba(0, 0, 0, 0.06)",
                fontSize: 14,
                border: msg.isUser 
                  ? "none" 
                  : "1px solid rgba(212, 175, 55, 0.15)",
              }}
            >
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                color: "#111827",
                padding: "10px 12px",
                borderRadius: 14,
                borderTopLeftRadius: 4,
                maxWidth: "76%",
                lineHeight: 1.35,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                fontSize: 14,
                border: "1px solid rgba(212, 175, 55, 0.15)",
              }}
            >
              Thinking...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div
        className="chat-input-container"
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "12px 16px",
          borderTop: "1px solid rgba(212, 175, 55, 0.2)",
          background: "#fdfbf7",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isLoading) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={
            !canSendMessage() && isGuest
              ? "Log in to continue..."
              : !canSendMessage() && !isGuest
              ? "Insufficient credits..."
              : "Type your message..."
          }
          readOnly={!canSendMessage() || isLoading}
          disabled={isLoading}
          className="chat-input-field"
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(212, 175, 55, 0.3)",
            fontSize: 14,
            outline: "none",
            background: !canSendMessage() ? "#f3f4f6" : "white",
            color: "inherit",
            transition: "border-color 0.2s ease",
            cursor: !canSendMessage() ? "pointer" : "text",
            opacity: !canSendMessage() ? 0.6 : 1,
          }}
          onClick={() => {
            // Show popup when clicking on read-only input (when blocked)
            if (!canSendMessage()) {
              const blockedReason = getBlockedReason();
              if (blockedReason) {
                if (blockedReason.type === 'guest_limit') {
                  setShowLoginPrompt(true);
                } else if (blockedReason.type === 'insufficient_credits') {
                  setShowTopUpPrompt(true);
                }
              }
            }
          }}
          onFocus={(e) => {
            if (canSendMessage()) {
              e.currentTarget.style.borderColor = "#d4af37";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212, 175, 55, 0.1)";
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.3)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          onClick={() => {
            // Show popup if disabled, otherwise send message
            if (!canSendMessage()) {
              const blockedReason = getBlockedReason();
              if (blockedReason) {
                if (blockedReason.type === 'guest_limit') {
                  setShowLoginPrompt(true);
                } else if (blockedReason.type === 'insufficient_credits') {
                  setShowTopUpPrompt(true);
                }
              }
              return;
            }
            handleSendMessage();
          }}
          disabled={isLoading}
          className="chat-send-button"
          style={{
            padding: "10px 24px",
            background: "linear-gradient(135deg, #d4af37, #b8972e)",
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
            opacity: isLoading ? 0.6 : 1,
            boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "fit-content",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(212, 175, 55, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(212, 175, 55, 0.3)";
          }}
        >
          <span className="send-button-text">{isLoading ? "Sending..." : "Send"}</span>
          <span className="send-button-emoji">{isLoading ? "⏳" : "↑"}</span>
        </button>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#111827" }}>
              Free Questions Used
            </h3>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>
              You've used your 2 free questions. Please log in to continue this conversation.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowLoginPrompt(false)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#374151",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Store current page URL for redirect after login
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('tgs:returnUrl', window.location.pathname + window.location.search);
                  }
                  setShowLoginPrompt(false);
                  router.push('/auth/user?login=true');
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #d4af37, #b8972e)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Up Prompt Modal for Insufficient Credits */}
      {showTopUpPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
          onClick={() => setShowTopUpPrompt(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#111827" }}>
              Credits Expired
            </h3>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 8, lineHeight: 1.5 }}>
              You don't have enough credits to continue this conversation.
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20, lineHeight: 1.5 }}>
              Required: <strong>{pricing.creditsPerQuestion} credits</strong> per question
              <br />
              Available: <strong>{walletBalance || 0} credits</strong>
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowTopUpPrompt(false)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#374151",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Store current page URL for redirect after top-up
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('tgs:returnUrl', window.location.pathname + window.location.search);
                  }
                  setShowTopUpPrompt(false);
                  router.push('/wallet');
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #d4af37, #b8972e)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Top Up Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
