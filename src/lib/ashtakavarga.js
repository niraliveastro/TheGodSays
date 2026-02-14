// lib/astrology/ashtakavarga.js
// Parāśari Ashtakavarga (BAV + SAV)
// Contributors: Lagna + Sun..Saturn
// Targets: Sun..Saturn
// Sign indexing: input 1..12 → internal 0..11

export const PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
];

export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

// Contributors include Lagna
const CONTRIBUTORS = ["Lagna", ...PLANETS];

/**
 * RULES[target][contributor] = offsets (0..11)
 * 0 = same sign, 1 = next sign, etc.
 */
export const RULES = {
  Sun: {
    Sun: [0, 1, 3, 6, 7, 8, 9, 10],
    Moon: [2, 5, 9, 10],
    Mars: [0, 1, 3, 6, 7, 8, 9, 10],
    Mercury: [2, 4, 5, 8, 9, 10, 11],
    Jupiter: [4, 5, 8, 10],
    Venus: [5, 6, 11],
    Saturn: [0, 1, 3, 6, 7, 8, 9, 10],
    Lagna: [2, 3, 5, 9, 10, 11],
  },
  Moon: {
    Sun: [2, 5, 6, 7, 9, 10],
    Moon: [0, 2, 5, 6, 9, 10],
    Mars: [1, 2, 4, 5, 8, 9, 10],
    Mercury: [0, 2, 3, 4, 6, 7, 9, 10],
    Jupiter: [0, 3, 6, 7, 9, 10, 11],
    Venus: [2, 3, 4, 6, 8, 9, 10],
    Saturn: [2, 4, 5, 10],
    Lagna: [2, 5, 9, 10],
  },
  Mars: {
    Sun: [2, 4, 5, 9, 10],
    Moon: [2, 5, 10],
    Mars: [0, 1, 3, 6, 7, 9, 10],
    Mercury: [2, 4, 5, 10],
    Jupiter: [5, 9, 10, 11],
    Venus: [5, 7, 10, 11],
    Saturn: [0, 3, 6, 7, 8, 9, 10],
    Lagna: [0, 2, 5, 9, 10],
  },
  Mercury: {
    Sun: [4, 5, 8, 10, 11],
    Moon: [1, 3, 5, 7, 9, 10],
    Mars: [0, 1, 3, 6, 7, 8, 9, 10],
    Mercury: [0, 2, 4, 5, 8, 9, 10, 11],
    Jupiter: [5, 7, 10, 11],
    Venus: [0, 1, 2, 3, 4, 7, 8, 10],
    Saturn: [0, 1, 3, 6, 7, 8, 9, 10],
    Lagna: [0, 1, 3, 5, 7, 9, 10],
  },
  Jupiter: {
    Sun: [0, 1, 2, 3, 6, 7, 8, 9, 10],
    Moon: [1, 4, 6, 8, 10],
    Mars: [0, 1, 3, 6, 7, 9, 10],
    Mercury: [0, 1, 3, 4, 5, 8, 9, 10],
    Jupiter: [0, 1, 2, 3, 6, 7, 9, 10],
    Venus: [1, 4, 5, 8, 9, 10],
    Saturn: [2, 4, 5, 11],
    Lagna: [0, 1, 3, 4, 5, 6, 8, 9, 10],
  },
  Venus: {
    Sun: [7, 10, 11],
    Moon: [0, 1, 2, 3, 4, 7, 8, 10, 11],
    Mars: [2, 4, 5, 8, 10, 11],
    Mercury: [2, 4, 5, 8, 10],
    Jupiter: [4, 7, 8, 9, 10],
    Venus: [0, 1, 2, 3, 4, 7, 8, 9, 10],
    Saturn: [2, 3, 4, 7, 8, 9, 10],
    Lagna: [0, 1, 2, 3, 4, 7, 8, 10],
  },
  Saturn: {
    Sun: [0, 1, 3, 6, 7, 9, 10],
    Moon: [2, 5, 10],
    Mars: [2, 4, 5, 9, 10, 11],
    Mercury: [5, 7, 8, 9, 10, 11],
    Jupiter: [4, 5, 10, 11],
    Venus: [5, 10, 11],
    Saturn: [2, 4, 5, 10],
    Lagna: [0, 2, 3, 5, 9, 10],
  },
};

/**
 * Compute Ashtakavarga
 */
export function computeAshtakavarga(planetsExtended) {
  if (!planetsExtended?.Ascendant?.current_sign) {
    throw new Error("Ascendant.current_sign missing");
  }

  const S = {
    Lagna: planetsExtended.Ascendant.current_sign - 1,
  };

  for (const p of PLANETS) {
    const v = planetsExtended[p]?.current_sign;
    if (typeof v !== "number") {
      throw new Error(`${p}.current_sign missing`);
    }
    S[p] = v - 1;
  }

  const BAV = {};
  for (const t of PLANETS) {
    BAV[t] = Array(12).fill(0);
  }

  // ✅ Correct contributor-based logic
  for (const t of PLANETS) {
    for (const c of CONTRIBUTORS) {
      const offsets = RULES[t][c];
      if (!offsets) continue;

      const Sc = S[c];

      for (const k of offsets) {
        const r = (Sc + k) % 12;
        BAV[t][r]++;
      }
    }
  }

  const SAV = Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    for (const t of PLANETS) {
      SAV[i] += BAV[t][i];
    }
  }

  const SAV_house = {};
  for (let h = 1; h <= 12; h++) {
    const r = (S.Lagna + (h - 1)) % 12;
    SAV_house[h] = SAV[r];
  }

  const BAV_totals = {};
  for (const t of PLANETS) {
    BAV_totals[t] = BAV[t].reduce((a, b) => a + b, 0);
  }

  return {
    lagnaSign: SIGNS[S.Lagna],
    BAV,
    SAV,
    SAV_house,
    totals: {
      BAV_totals,
      SAV_total: SAV.reduce((a, b) => a + b, 0),
    },
  };
}
