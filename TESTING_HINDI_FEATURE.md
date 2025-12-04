# Testing Hindi Language Feature - Complete Guide

## Prerequisites
- Application should be running locally or on dev/staging server
- Browser with developer tools (Chrome/Firefox recommended)

## Step-by-Step Testing Guide

### Test 1: Language Switcher Basic Functionality

1. **Open the application home page**
   - URL: `http://localhost:3000/` (or your dev URL)

2. **Locate the language switcher**
   - Look in the top navigation bar (right side)
   - Should see a dropdown with 🌐 icon
   - Default should show "English"

3. **Switch to Hindi**
   - Click the language dropdown
   - Select "हिन्दी"
   - **Expected Result:** Entire page content should switch to Hindi instantly

4. **Verify persistence**
   - Refresh the page (F5)
   - **Expected Result:** Page should still be in Hindi (saved in localStorage)

5. **Switch back to English**
   - Click dropdown again
   - Select "English"
   - **Expected Result:** Content switches back to English

---

### Test 2: Navigation Menu in Hindi

1. **Switch to Hindi** (if not already)

2. **Check top navigation items:**
   - ✅ "Talk to Astrologer" → "ज्योतिषी से बात करें"
   - ✅ "AI Predictions" → "AI भविष्यवाणी"
   - ✅ "Matching" → "कुंडली मिलान"
   - ✅ "Tools" → "उपकरण"
   - ✅ "Wallet" → "वॉलेट"
   - ✅ "My Account" → "मेरा खाता"
   - ✅ "Sign In" → "साइन इन करें"

3. **Check Tools dropdown:**
   - Click on "उपकरण" (Tools)
   - Verify dropdown items are in Hindi:
     - ✅ "अंकज्योतिष कैलकुलेटर" (Numerology)
     - ✅ "ग्रह गोचर" (Planetary Transit)
     - ✅ "हिंदू कैलेंडर" (Calendar)
     - ✅ "पंचांग" (Panchang)

4. **Check My Account dropdown** (if logged in):
   - Click on "मेरा खाता" (My Account)
   - Verify:
     - ✅ "मेरी प्रोफ़ाइल" (My Profile)
     - ✅ "परिवार के सदस्य" (Family Members)

---

### Test 3: Kundali Page with Hindi

1. **Navigate to Kundali page**
   - Click on "Tools" → "Kundali" or visit `/kundali`

2. **Verify page header:**
   - ✅ Title: "जन्म कुंडली - वैदिक जन्म चार्ट"
   - ✅ Description in Hindi

3. **Verify form labels:**
   - ✅ "पूरा नाम" (Full Name)
   - ✅ "लिंग" (Gender)
     - ✅ "पुरुष" (Male)
     - ✅ "महिला" (Female)
     - ✅ "अन्य" (Other)
   - ✅ "जन्म तिथि" (Birth Date)
   - ✅ "जन्म समय" (Birth Time)
   - ✅ "जन्म स्थान" (Place of Birth)
   - ✅ "भाषा" (Language)

4. **Test form validation:**
   - Click "कुंडली बनाएं" button without filling form
   - **Expected Result:** Error messages in Hindi
     - "कृपया अपना नाम दर्ज करें"
     - "कृपया एक स्थान चुनें"

5. **Generate a Kundali:**
   - Fill in all required fields
   - Click "कुंडली बनाएं" (Generate Kundali)
   - **Expected Result:** 
     - Button text changes to "प्रोसेसिंग..." while loading
     - After generation, "चार्ट डाउनलोड करें" button appears

---

### Test 4: Numerology Page with Hindi

1. **Navigate to Numerology page**
   - Click "Tools" → "Numerology" or visit `/numerology`

2. **Verify page content:**
   - ✅ Title: "अंकज्योतिष कैलकुलेटर"
   - ✅ Subtitle: "अपने अंक जानें"

3. **Verify form labels:**
   - ✅ "पूरा नाम" with placeholder "अपना पूरा जन्म नाम दर्ज करें"
   - ✅ "जन्म तिथि"
   - ✅ Required indicator: "*यह फ़ील्ड आवश्यक है"

4. **Test calculation:**
   - Enter a name and birth date
   - Results should appear with Hindi labels:
     - ✅ "भाग्य अंक" (Destiny Number)
     - ✅ "जीवन पथ अंक" (Life Path Number)
     - ✅ "आत्मा आग्रह अंक" (Soul Urge)

5. **Test history features:**
   - ✅ "इतिहास में सहेजें" button (Save to History)
   - ✅ "इतिहास साफ़ करें" button (Clear History)

---

### Test 5: AI Chatbot in Hindi (Most Important!)

1. **Navigate to Predictions page**
   - Click "AI Predictions" or visit `/predictions`

2. **Fill in birth details and generate predictions**
   - This creates chart data for the chatbot

3. **Open the chatbot** (should appear automatically or click chat icon)

4. **Verify welcome message:**
   - **Expected in Hindi:** "Predictions AI चैट में आपका स्वागत है! मैं आज आपकी कैसे मदद कर सकता हूं?"

5. **Test Hindi responses:**
   
   **Test Question 1 (in Hindi):**
   - Type: "मेरी कुंडली के बारे में बताएं"
   - **Expected:** AI responds completely in Hindi with astrological analysis
   
   **Test Question 2 (in English):**
   - Type: "Tell me about my career"
   - **Expected:** AI still responds in Hindi (because Hindi is selected)
   
   **Test Question 3 (Mixed):**
   - Type: "What is my current dasha?"
   - **Expected:** AI responds in Hindi explaining the dasha

6. **Verify status messages:**
   - While AI is thinking: "सोच रहा है..."
   - If error occurs: "क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।"

7. **Test chat input placeholder:**
   - ✅ Should show: "अपनी कुंडली के बारे में कुछ भी पूछें..."

---

### Test 6: Error Messages in Hindi

1. **Navigate to any form page** (Kundali, Predictions, etc.)

2. **Switch to Hindi**

3. **Test validation errors:**
   - Submit empty form
   - **Expected errors in Hindi:**
     - "यह फ़ील्ड आवश्यक है"
     - "कृपया अपना नाम दर्ज करें"
     - "कृपया लिंग चुनें"
     - "कृपया एक स्थान चुनें"

4. **Test API errors:**
   - Try generating Kundali with invalid data
   - **Expected:** Error message in Hindi

---

### Test 7: Cross-Page Consistency

1. **Start in Hindi mode**

2. **Navigate through multiple pages:**
   - Home → Kundali → Numerology → Predictions → Matching

3. **Verify on each page:**
   - ✅ Language remains Hindi throughout
   - ✅ All navigation items stay in Hindi
   - ✅ Page content is in Hindi
   - ✅ Form elements are in Hindi

4. **Open chatbot on different pages:**
   - Should always greet in Hindi
   - Should always respond in Hindi

---

### Test 8: Authentication Flow in Hindi

1. **While in Hindi mode, click "साइन इन करें"**

2. **Verify auth modal:**
   - ✅ Tab buttons: "साइन इन करें" / "साइन अप करें"
   - ✅ Form labels in Hindi:
     - "ईमेल"
     - "पासवर्ड"
     - "पासवर्ड की पुष्टि करें"
   - ✅ Buttons in Hindi:
     - "साइन इन करें" / "साइन अप करें"
     - "Google से साइन इन करें"

3. **Test validation:**
   - Try submitting with invalid data
   - **Expected:** Validation messages in Hindi

---

### Test 9: Mobile Responsive Testing

1. **Open browser DevTools** (F12)

2. **Switch to mobile view** (Toggle device toolbar)

3. **Test mobile navigation:**
   - Open hamburger menu
   - Verify all items are in Hindi
   - Test dropdowns in mobile view

4. **Test chatbot on mobile:**
   - Should display properly
   - Hindi text should wrap correctly
   - Input should work properly

---

### Test 10: Browser Storage Testing

1. **Open Browser DevTools → Application/Storage**

2. **Check localStorage:**
   - Look for key: `tgs:language`
   - Value should be: `"hi"` when Hindi is selected
   - Value should be: `"en"` when English is selected

3. **Test clearing storage:**
   - Clear localStorage
   - Refresh page
   - **Expected:** Defaults to English
   - Switch to Hindi again
   - **Expected:** Saved to localStorage again

---

## Automated Testing Checklist

### Visual Checks (All Pages):
- [ ] Navigation bar shows Hindi text
- [ ] Page titles are in Hindi
- [ ] Form labels are in Hindi
- [ ] Button text is in Hindi
- [ ] Placeholders are in Hindi
- [ ] Validation messages are in Hindi
- [ ] Error messages are in Hindi
- [ ] Success messages are in Hindi

### Functional Checks:
- [ ] Language switcher changes language
- [ ] Language persists after refresh
- [ ] All forms work in Hindi mode
- [ ] All buttons work in Hindi mode
- [ ] Navigation works in Hindi mode
- [ ] Dropdowns work in Hindi mode

### Chatbot Specific:
- [ ] Welcome message is in Hindi
- [ ] AI responses are in Hindi
- [ ] Error messages are in Hindi
- [ ] Status messages are in Hindi
- [ ] Placeholder text is in Hindi
- [ ] Chat works across all pages

---

## Common Issues to Check

### If Hindi not showing:
1. ✅ Check if language switcher is visible
2. ✅ Check browser console for errors
3. ✅ Verify localStorage has `tgs:language` = `"hi"`
4. ✅ Hard refresh (Ctrl+Shift+R) to clear cache

### If chatbot not responding in Hindi:
1. ✅ Verify language is set to Hindi before opening chat
2. ✅ Check browser console for API errors
3. ✅ Verify OpenAI API key is configured
4. ✅ Check network tab for request payload (should include `language: "hi"`)

### If text appears broken:
1. ✅ Verify font supports Devanagari script
2. ✅ Check CSS for proper font-family
3. ✅ Test in different browsers

---

## Success Criteria

### ✅ All tests pass if:
1. **Language switcher works** - Switches between EN/HI instantly
2. **Content translates** - All UI elements show Hindi text
3. **Persistence works** - Language choice survives page refresh
4. **Chatbot speaks Hindi** - AI responds in Hindi when Hindi is selected
5. **Forms validate in Hindi** - Error messages appear in Hindi
6. **Navigation works** - All menu items and links work in Hindi mode
7. **No console errors** - No JavaScript errors in browser console
8. **Responsive design** - Works on desktop and mobile
9. **Cross-browser** - Works in Chrome, Firefox, Safari, Edge
10. **Professional translations** - Hindi text reads naturally and correctly

---

## Reporting Issues

If you find any issues during testing, please note:
1. **What page** you were on
2. **What you clicked** or did
3. **What you expected** to see
4. **What actually happened**
5. **Screenshot** if possible
6. **Browser and OS** details
7. **Console errors** (if any)

---

## Quick Test Commands (For Developers)

### Test localStorage:
```javascript
// Check current language
localStorage.getItem('tgs:language')

// Set to Hindi
localStorage.setItem('tgs:language', 'hi')

// Set to English
localStorage.setItem('tgs:language', 'en')

// Clear
localStorage.removeItem('tgs:language')
```

### Test translation hook in console:
```javascript
// If you have access to React DevTools
// Find any component using useTranslation
// Check the t object structure
```

---

## Performance Testing

### Check translation loading:
1. Open Network tab in DevTools
2. Switch language
3. Verify no extra network requests (translations are bundled)
4. Language switch should be instant (< 100ms)

### Check bundle size:
```bash
# Build the app
npm run build

# Check if Hindi translations significantly increased bundle size
# Both en.js and hi.js should be similar in size
```

---

## Final Verification

### Complete App Tour in Hindi:
1. ✅ Home page - All sections in Hindi
2. ✅ Kundali page - Form and results in Hindi
3. ✅ Matching page - All fields in Hindi
4. ✅ Predictions page - Results in Hindi
5. ✅ Numerology page - Calculator in Hindi
6. ✅ Panchang page - Timings in Hindi
7. ✅ AI Chatbot - Responds in Hindi on ALL pages
8. ✅ Profile page - Fields in Hindi
9. ✅ Wallet page - Transactions in Hindi
10. ✅ Auth modals - Sign in/up in Hindi

**If all 10 areas show Hindi correctly, the implementation is successful! ✅**

