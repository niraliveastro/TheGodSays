
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/contexts/ThemeContext';

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
    
    // Extract planetary data - handle both structures
    const femalePlacements = female?.details?.placements || female?.placements || [];
    const malePlacements = male?.details?.placements || male?.placements || [];
    const femaleShadbala = female?.details?.shadbalaRows || female?.shadbalaRows || [];
    const maleShadbala = male?.details?.shadbalaRows || male?.shadbalaRows || [];
    const femaleDasha = female?.details?.currentDasha || female?.currentDasha || null;
    const maleDasha = male?.details?.currentDasha || male?.currentDasha || null;
    
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
    
    return `You are an expert Vedic astrologer analyzing a RELATIONSHIP MATCHING session. You have COMPLETE ACCESS to all the birth chart data and compatibility analysis below. You MUST use this data to answer ALL questions accurately.

CRITICAL: You have access to ALL the following information. When users ask questions, you MUST reference this specific data. Do NOT say you don't have access to information that is clearly provided below.

## COUPLE INFORMATION

### Female Individual
- **Name:** ${femaleName}
- **Date of Birth:** ${femaleDob}
- **Time of Birth:** ${femaleTob}
- **Place of Birth:** ${femalePlace}
- **Planetary Placements:** ${JSON.stringify(femalePlacements, null, 2)}
- **Shadbala Strengths:** ${JSON.stringify(femaleShadbala, null, 2)}
- **Current Dasha:** ${JSON.stringify(femaleDasha, null, 2)}

### Male Individual
- **Name:** ${maleName}
- **Date of Birth:** ${maleDob}
- **Time of Birth:** ${maleTob}
- **Place of Birth:** ${malePlace}
- **Planetary Placements:** ${JSON.stringify(malePlacements, null, 2)}
- **Shadbala Strengths:** ${JSON.stringify(maleShadbala, null, 2)}
- **Current Dasha:** ${JSON.stringify(maleDasha, null, 2)}

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

## IMPORTANT RULES

1. **ALWAYS use the actual names** when asked: Female is "${femaleName}", Male is "${maleName}"
2. **ALWAYS reference the actual data** provided above
3. For marriage timing, analyze the Dasha periods and planetary transits from the data provided
4. Calculate specific years by analyzing current ages and Dasha periods
5. Be specific and use the actual numbers from the compatibility scores
6. DO NOT say you don't have access to information that is clearly provided above
7. Use markdown formatting for clear responses
8. Be practical and helpful in your guidance

Remember: You have COMPLETE access to all this data. Use it to provide accurate, specific answers to all questions.`;
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
  
  return `You are a PROFESSIONAL VEDIC ASTROLOGER with deep expertise in Jyotish Shastra (Vedic Astrology). You analyze birth charts using traditional Vedic principles including:

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

CRITICAL RULES:
1. You have COMPLETE ACCESS to all the birth chart data below. Reference specific planetary positions, houses, signs, and Dasha periods.
2. NEVER say you don't have access to information that is clearly provided below.
3. **FOR MARRIAGE TIMING**: Person was born in ${birthYear || "year from DOB"} (currently ${age !== null ? `${age} years old` : "age calculable"}). 
   - Realistic marriage years: ${birthYear && age ? `${birthYear + Math.max(22, age + 2)}-${birthYear + Math.min(35, age + 15)}` : "typically 22-35 years from birth"}
   - If Dasha dates show years like 2100+, they are WRONG - calculate from birth year instead
   - NEVER suggest unrealistic dates (e.g., 2103 for someone born in ${birthYear || "2004"})
   - Always provide realistic calendar years with detailed astrological reasoning
4. **RESPONSE STYLE**: Write like a professional astrologer - detailed, knowledgeable, using Vedic terminology, explaining planetary influences, and providing comprehensive analysis.

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

1. **Start with Current Status**: Always mention current Dasha and its significance
2. **Provide Detailed Analysis**: Don't just state facts - explain the astrological reasoning
3. **Use Vedic Terminology**: Use proper Sanskrit/Vedic terms (Graha, Rashi, Nakshatra, Dasha, Bhava, etc.)
4. **Be Comprehensive**: Cover multiple astrological factors, not just one
5. **Calculate Realistic Dates**: Always calculate from birth year (${birthYear || "provided"}), never use unrealistic absolute dates
6. **Professional Tone**: Write like an experienced astrologer explaining to a client
7. **Practical Guidance**: Always end with actionable insights or guidance

**Remember**: You are a PROFESSIONAL VEDIC ASTROLOGER. Your responses should reflect deep astrological knowledge, detailed analysis, and practical wisdom - just like a real Pandit or Jyotishi would provide.

Remember: You have COMPLETE access to all this data including name (${name}), age (${age !== null ? age : "calculable from DOB"}), birth details, planetary positions, and Dasha timeline. Use it to provide accurate, specific answers to all questions.

${language === 'hi' ? `\n\n**CRITICAL LANGUAGE INSTRUCTION**: The user has selected HINDI as their preferred language. You MUST respond in Hindi (हिंदी). All your responses, explanations, and analysis should be ENTIRELY in Hindi. Use proper Hindi astrological terms like ग्रह (planets), राशि (signs), नक्षत्र (nakshatras), दशा (dasha), भाव (houses), कुंडली (kundali), etc. Write as a professional Hindi-speaking Jyotishi would communicate.` : ''}`;
}


const Chat = ({ pageTitle, initialData = null, onClose = null }) => {
  const { t, language } = useTranslation();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Store the system context prompt that will be included in every API call
  const [systemContext, setSystemContext] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isCosmic = theme === 'cosmic';

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

  useEffect(() => {
    // Add a default message when the component mounts
    const welcomeMsg = language === 'hi' 
      ? `${pageTitle} AI चैट में आपका स्वागत है! मैं आज आपकी कैसे मदद कर सकता हूं?`
      : `Welcome to the ${pageTitle} AI chat! How can I help you today?`;
    setMessages([{ text: welcomeMsg, isUser: false }]);
    // Reset system context when page title changes
    setSystemContext(null);
  }, [pageTitle]);

  // If initialData is provided, build and store the context, then send it to the AI
  // Use a ref to ensure we only send the context once (prevents double-send
  // in React StrictMode which mounts/unmounts components twice in dev).
  const contextSentRef = useRef(false);
  useEffect(() => {
    if (!initialData) return;
    if (contextSentRef.current) return;
    contextSentRef.current = true;

    const sendContext = async () => {
      // Build the context prompt with language
      const contextPrompt = buildContextPrompt(initialData, pageTitle, language);
      // Store it for use in subsequent messages
      setSystemContext(contextPrompt);

      // show a short assistant message to indicate data was provided
      const providingMsg = language === 'hi' 
        ? 'AI सहायक को आपका चार्ट डेटा प्रदान किया जा रहा है...'
        : 'Providing your chart data to the AI assistant...';
      setMessages((m) => [...m, { text: providingMsg, isUser: false }]);
      setIsLoading(true);
      try {
        // Build conversation history for initial context
        const userPrompt = language === 'hi'
          ? 'कृपया प्रदान किए गए चार्ट डेटा का विश्लेषण करें और मुझे एक व्यापक विवरण दें। कृपया हिंदी में जवाब दें।'
          : 'Please analyze the provided chart data and give me a comprehensive reading.';
        const conversationHistory = [
          { role: 'system', content: contextPrompt },
          { role: 'user', content: userPrompt },
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationHistory,
            page: pageTitle,
            isContext: true,
            language: language,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send context to the server.');
        }

        const data = await response.json();

        // Display the assistant's response
        const fallbackMsg = language === 'hi' 
          ? 'सहायक द्वारा चार्ट डेटा प्राप्त किया गया।'
          : 'Chart data received by the assistant.';
        const assistantText = data?.response || fallbackMsg;
        setMessages((m) => [...m, { text: assistantText, isUser: false }]);
      } catch (error) {
        console.error('Error sending initial context to chat:', error);
        const errorMsg = language === 'hi'
          ? 'AI को चार्ट डेटा प्रदान करने में विफल।'
          : 'Failed to provide chart data to the AI.';
        setMessages((m) => [...m, { text: errorMsg, isUser: false }]);
      } finally {
        setIsLoading(false);
      }
    };

    // send the context asynchronously (don't block UI)
    sendContext();
  }, [initialData, pageTitle]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage = input.trim();
    const newMessages = [...messages, { text: userMessage, isUser: true }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history from all messages
      // ALWAYS start with system context if available - this is CRITICAL
      const conversationHistory = [];
      
      if (systemContext) {
        // System context contains ALL the chart data - this must be included in EVERY request
        conversationHistory.push({ role: 'system', content: systemContext });
      } else {
        // Fallback system message if no context yet
        const systemMsg = language === 'hi'
          ? `आप ${pageTitle} पृष्ठ के लिए एक सहायक हैं। कृपया हिंदी में जवाब दें।`
          : `You are a helpful assistant for the ${pageTitle} page.`;
        conversationHistory.push({ 
          role: 'system', 
          content: systemMsg
        });
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

      // Debug: Log conversation history length (system + messages)
      console.log(`[Chat] Sending conversation with ${conversationHistory.length} messages (including system context)`);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          conversationHistory,
          page: pageTitle,
          language: language // Pass the current language to the API
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from the server.');
      }

      const data = await response.json();
      setMessages([...newMessages, { text: data.response, isUser: false }]);
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
        background: isCosmic ? "rgba(22, 33, 62, 0.95)" : "#fdfbf7",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(212, 175, 55, 0.3)",
        boxShadow: isCosmic 
          ? "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(212, 175, 55, 0.2)"
          : "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 20px rgba(212, 175, 55, 0.15)",
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#ffffff",
                margin: 0,
                fontFamily: '"Cormorant Garamond", serif',
                background: isCosmic 
                  ? "linear-gradient(135deg, #d4af37, #fbbf24)"
                  : "linear-gradient(135deg, #ffffff, #fef3c7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AI Astrologer Chat
        </h2>
            <span style={{ 
              fontSize: 12, 
              color: isCosmic ? "rgba(212, 175, 55, 0.9)" : "rgba(255, 255, 255, 0.8)", 
              display: "block", 
              marginTop: 2 
            }}>
              {pageTitle} Assistant
        </span>
      </div>
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
                  : isCosmic 
                    ? "rgba(22, 33, 62, 0.9)"
                    : "rgba(255, 255, 255, 0.9)",
                color: msg.isUser 
                  ? "white" 
                  : isCosmic 
                    ? "#fbbf24"
                    : "#111827",
                padding: "10px 12px",
                borderRadius: 14,
                borderTopLeftRadius: msg.isUser ? 14 : 4,
                borderTopRightRadius: msg.isUser ? 4 : 14,
                maxWidth: "76%",
                lineHeight: 1.35,
                boxShadow: msg.isUser 
                  ? "0 4px 14px rgba(212, 175, 55, 0.3)"
                  : isCosmic
                    ? "0 2px 8px rgba(0, 0, 0, 0.3)"
                    : "0 2px 8px rgba(0, 0, 0, 0.06)",
                fontSize: 14,
                border: msg.isUser 
                  ? "none" 
                  : isCosmic
                    ? "1px solid rgba(212, 175, 55, 0.3)"
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
                background: isCosmic 
                  ? "rgba(22, 33, 62, 0.9)"
                  : "rgba(255, 255, 255, 0.9)",
                color: isCosmic ? "#fbbf24" : "#111827",
                padding: "10px 12px",
                borderRadius: 14,
                borderTopLeftRadius: 4,
                maxWidth: "76%",
                lineHeight: 1.35,
                boxShadow: isCosmic
                  ? "0 2px 8px rgba(0, 0, 0, 0.3)"
                  : "0 2px 8px rgba(0, 0, 0, 0.06)",
                fontSize: 14,
                border: isCosmic
                  ? "1px solid rgba(212, 175, 55, 0.3)"
                  : "1px solid rgba(212, 175, 55, 0.15)",
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
          background: isCosmic ? "rgba(22, 33, 62, 0.9)" : "#fdfbf7",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type your message..."
          className="chat-input-field"
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(212, 175, 55, 0.3)",
            fontSize: 14,
            outline: "none",
            background: isCosmic ? "rgba(10, 10, 15, 0.8)" : "white",
            color: isCosmic ? "#d4af37" : "inherit",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#d4af37";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212, 175, 55, 0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.3)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          onClick={handleSendMessage}
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
    </div>
  );
};

export default Chat;
