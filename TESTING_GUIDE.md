# 🧪 TESTING GUIDE - AI Predictions & Kundli Matching

## Quick Test Commands

```bash
# Start your dev server
npm run dev

# Navigate to pages
http://localhost:3000/ai-predictions
http://localhost:3000/matching
```

---

## ✅ AI PREDICTION PAGE TEST

### Test Case 1: Valid Input
**Steps:**
1. Navigate to `/ai-predictions`
2. Fill form:
   - Name: "Rahul Sharma"
   - DOB: "1990-05-15"
   - TOB: "14:30"
   - Place: Type "Mumbai", select "Mumbai, Maharashtra, India"
3. Click "Get AI Predictions"

**Expected Results:**
- ✅ Form submits without errors
- ✅ Loading spinner shows for 5-10 seconds
- ✅ Results display with:
  - User name "Rahul Sharma"
  - Birth details
  - Lagna (Ascendant)
  - Rashi (Moon Sign)
  - Nakshatra
  - Planet table with 9+ planets
  - Current Mahadasha and Antardasha
  - Dasha dates
- ✅ "New Prediction" button appears
- ✅ No console errors

---

### Test Case 2: Place Search
**Steps:**
1. In Place of Birth field, type "Del"
2. Wait 1 second

**Expected Results:**
- ✅ Suggestions dropdown appears
- ✅ Shows cities starting with "Del" (Delhi, etc.)
- ✅ Each suggestion has MapPin icon
- ✅ Clicking a suggestion fills the field
- ✅ Suggestions close after selection

---

### Test Case 3: Form Validation
**Steps:**
1. Try to submit empty form
2. Fill only name, try to submit
3. Fill all except place search selection

**Expected Results:**
- ✅ HTML5 validation prevents submission
- ✅ Browser shows "Please fill out this field"
- ✅ If place not selected from dropdown, error shows:
   "Please select a valid place from suggestions"

---

### Test Case 4: Mobile Responsive
**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone SE (375px)
4. Test form and results

**Expected Results:**
- ✅ Form inputs stack vertically
- ✅ Date/Time inputs in single column
- ✅ Text readable (no overflow)
- ✅ Buttons tap-friendly (min 44px)
- ✅ Sticky CTA bar shows only icons
- ✅ Results cards stack properly
- ✅ Planet table scrolls horizontally if needed

---

### Test Case 5: Toggle Features
**Steps:**
1. After getting results, click "Expert" toggle
2. Click "South Indian" chart toggle

**Expected Results:**
- ✅ "Expert" shows additional technical details
- ✅ Coordinate display shows
- ✅ Ayanamsa info visible
- ✅ Planet table shows Nakshatra column
- ✅ Chart type toggle highlighted
- ✅ Toggles work smoothly

---

### Test Case 6: New Prediction
**Steps:**
1. After viewing results, click "New Prediction"

**Expected Results:**
- ✅ Form reappears
- ✅ All fields cleared
- ✅ Place search reset
- ✅ Results hidden
- ✅ Ready for new input

---

## ✅ KUNDLI MATCHING PAGE TEST

### Test Case 1: Valid Matching
**Steps:**
1. Navigate to `/matching`
2. Fill Person 1 (Boy):
   - Name: "Rahul"
   - DOB: "1990-05-15"
   - TOB: "14:30"
   - Place: Type "Mumbai", select from dropdown
3. Fill Person 2 (Girl):
   - Name: "Priya"
   - DOB: "1992-08-20"
   - TOB: "09:15"
   - Place: Type "Delhi", select from dropdown
4. Click "Check Compatibility"

**Expected Results:**
- ✅ Form submits without errors
- ✅ Loading spinner shows for 5-10 seconds
- ✅ Results display with:
  - Two couple cards (Boy + Girl)
  - Birth details for both
  - Animated heart icon between cards
  - Large circular compatibility score (e.g., 24/36)
  - Grade badge (e.g., "Very Good")
  - Color-coded score circle
  - Verdict text
  - 8 Ashtakoota cards with individual scores
  - Each koota shows:
    - Name (e.g., "Varna")
    - Score (e.g., "1/1")
    - Progress bar
    - Pass/Fail status
    - Meaning
- ✅ CTA section appears
- ✅ "New Matching" button visible
- ✅ No console errors

---

### Test Case 2: Score Interpretation
**Steps:**
1. After getting results, check score

**Expected Score Ranges:**
- 28-36 = Excellent (Green)
- 24-27 = Very Good (Blue)
- 18-23 = Good (Orange)
- 12-17 = Average (Orange)
- 0-11 = Challenging (Red)

**Expected Results:**
- ✅ Grade matches score range
- ✅ Circle color matches grade
- ✅ Verdict text appropriate for grade
- ✅ Individual kootas color-coded

---

### Test Case 3: Ashtakoota Breakdown
**Steps:**
1. After results, scroll to Ashtakoota section
2. Check all 8 kootas

**Expected Kootas:**
1. ✅ Varna (max 1 point)
2. ✅ Vashya (max 2 points)
3. ✅ Tara (max 3 points)
4. ✅ Yoni (max 4 points)
5. ✅ Graha Maitri (max 5 points)
6. ✅ Gana (max 6 points)
7. ✅ Bhakoot (max 7 points)
8. ✅ Nadi (max 8 points)

**Each Koota Should Show:**
- ✅ Score out of max (e.g., "3/5")
- ✅ Progress bar
- ✅ Green if passing (≥50%)
- ✅ Red if failing (<50%)
- ✅ Meaning text

---

### Test Case 4: Mobile Responsive
**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar
3. Select iPhone SE (375px)
4. Test form and results

**Expected Results:**
- ✅ Person sections stack vertically
- ✅ Date/Time inputs in single column
- ✅ Both person forms visible
- ✅ Results: Couple cards stack vertically
- ✅ Heart rotates 90° between cards
- ✅ Score circle properly sized
- ✅ Ashtakoota cards stack
- ✅ All text readable
- ✅ Buttons accessible

---

### Test Case 5: Validation
**Steps:**
1. Try to submit with Person 1 empty
2. Try to submit with Person 2 place not selected

**Expected Results:**
- ✅ Validation prevents submission
- ✅ Error message shows
- ✅ Highlights missing fields
- ✅ Clear error messages

---

### Test Case 6: New Matching
**Steps:**
1. After viewing results, click "New Matching"

**Expected Results:**
- ✅ Form reappears
- ✅ All fields cleared (both persons)
- ✅ Place searches reset
- ✅ Results hidden
- ✅ Ready for new input

---

## 🔍 COMMON ISSUES & FIXES

### Issue: API Timeout
**Symptom:** Loading spinner shows indefinitely
**Fix:** Check console for error messages
**Possible Causes:**
- API key invalid/missing
- Network connection issue
- Rate limit exceeded

---

### Issue: Place Suggestions Not Showing
**Symptom:** Typing city name shows no dropdown
**Fix:**
- Type at least 2 characters
- Wait 500ms for debounce
- Check internet connection (uses OpenStreetMap)

---

### Issue: "Please select valid place" Error
**Symptom:** Error even after typing place
**Fix:**
- Must click/select from dropdown
- Typing alone doesn't set coordinates
- Dropdown selection sets lat/lon

---

### Issue: Incorrect API Response
**Symptom:** Results show but data looks wrong
**Fix:**
- Check console logs
- Verify input dates/times are valid
- Ensure coordinates are correct
- Check API response structure

---

## 📊 PERFORMANCE BENCHMARKS

### Expected Load Times:
- **Form Load:** < 1 second
- **Place Search:** 0.5-2 seconds per query
- **AI Predictions:** 5-15 seconds
- **Kundli Matching:** 3-10 seconds

### API Endpoints Response Time:
- `planets/extended`: 2-5 sec
- `vimsottari/dasa-information`: 2-4 sec
- `vimsottari/maha-dasas`: 2-4 sec
- `shadbala/summary`: 2-5 sec
- `match-making/ashtakoot-score`: 3-10 sec

**Note:** Times vary based on API server load and network speed.

---

## ✅ FINAL CHECKLIST

### AI Prediction Page:
- [ ] Form loads properly
- [ ] All fields accept input
- [ ] Place search works
- [ ] Validation prevents bad submissions
- [ ] Loading spinner shows
- [ ] Results display correctly
- [ ] Planet table shows all planets
- [ ] Dasha information visible
- [ ] Toggle buttons work
- [ ] Mobile responsive
- [ ] New Prediction button works
- [ ] CTAs clickable
- [ ] No console errors

### Kundli Matching Page:
- [ ] Form loads properly
- [ ] Both person sections visible
- [ ] Place search works for both
- [ ] Validation prevents bad submissions
- [ ] Loading spinner shows
- [ ] Results display correctly
- [ ] Score circle animates
- [ ] Grade badge correct
- [ ] All 8 kootas visible
- [ ] Each koota shows score
- [ ] Progress bars display
- [ ] Heart icon animates
- [ ] Mobile responsive
- [ ] New Matching button works
- [ ] CTAs clickable
- [ ] No console errors

---

## 🚀 READY FOR PRODUCTION

If all tests pass:
- ✅ Both pages are production-ready
- ✅ Real API integration working
- ✅ User experience polished
- ✅ Mobile responsive
- ✅ Error handling complete

---

**Test Date:** January 15, 2026  
**Status:** Ready for Testing
