# WhatsApp Business API Setup Guide (Twilio)

This guide will walk you through the complete process of setting up WhatsApp Business API through Twilio for production use.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ A Twilio account (upgraded from trial)
- ✅ A verified business (or be ready to verify)
- ✅ Business documentation (registration certificate, tax ID, etc.)
- ✅ A phone number you want to use for WhatsApp Business
- ✅ Patience (approval can take 1-4 weeks)

## 🚀 Step-by-Step Setup Process

### Step 1: Upgrade Your Twilio Account

**Why:** WhatsApp Business API requires a paid Twilio account (trial accounts cannot use it).

1. Log in to your Twilio Console: https://console.twilio.com/
2. Go to **Billing** → **Payment Methods**
3. Add a valid payment method (credit card)
4. Your account will be automatically upgraded

**Note:** You can still use the sandbox for testing while waiting for approval.

---

### Step 2: Navigate to WhatsApp Section

1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Or directly visit: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
3. You'll see two options:
   - **Sandbox** (for testing - already available)
   - **Get Started with WhatsApp Business API** (for production)

---

### Step 3: Start WhatsApp Business API Application

1. Click **"Get Started with WhatsApp Business API"** or **"Request Access"**
2. You'll be redirected to the WhatsApp Business API application form
3. Fill out the following information:

#### Business Information
- **Business Name:** Your registered business name
- **Business Type:** 
  - Small Business
  - Medium Business
  - Enterprise
- **Industry:** Select your industry (e.g., "Astrology & Spiritual Services")
- **Website:** Your business website URL
- **Business Description:** Brief description of your business

#### Contact Information
- **Business Email:** Official business email
- **Business Phone:** Business contact number
- **Business Address:** Registered business address

#### Use Case Details
- **Primary Use Case:** Select "Customer Support" or "Notifications"
- **Message Volume:** Estimate monthly messages (start conservative)
- **Message Types:**
  - ✅ Template Messages (required)
  - ✅ Session Messages (for conversations)
- **Sample Messages:** Provide examples of messages you'll send

#### Compliance
- **Opt-in Process:** Describe how users will opt-in to receive messages
- **Privacy Policy:** Link to your privacy policy
- **Terms of Service:** Link to your terms of service

---

### Step 4: Business Verification

Twilio will verify your business. You'll need to provide:

#### Required Documents (varies by country):

**For India:**
- ✅ Business Registration Certificate (GST Certificate, Company Registration)
- ✅ PAN Card (for business)
- ✅ Business Address Proof
- ✅ Bank Statement (last 3 months)
- ✅ Business License (if applicable)

**For USA:**
- ✅ Business Registration Certificate
- ✅ EIN (Employer Identification Number)
- ✅ Business Address Proof
- ✅ Business License

**For Other Countries:**
- Check Twilio's documentation for country-specific requirements

#### How to Submit Documents:

1. Twilio will send you an email with a link to upload documents
2. Log in to Twilio Console → **Messaging** → **WhatsApp** → **Business Verification**
3. Upload clear, readable scans/photos of all required documents
4. Ensure documents are:
   - In English or translated
   - Clear and readable
   - Recent (within last 3-6 months)
   - Match your business information exactly

---

### Step 5: Phone Number Verification

1. **Choose a Phone Number:**
   - You can use an existing Twilio number
   - Or purchase a new number specifically for WhatsApp
   - Number must support SMS (for verification)

2. **Verify the Number:**
   - Twilio will send a verification code via SMS
   - Enter the code in the console
   - Number will be linked to your WhatsApp Business account

---

### Step 6: Wait for Approval

**Timeline:**
- **Initial Review:** 3-7 business days
- **Business Verification:** 1-2 weeks (if documents are correct)
- **WhatsApp Approval:** 1-2 weeks
- **Total:** 2-4 weeks (sometimes longer)

**During Waiting Period:**
- ✅ Continue using WhatsApp Sandbox for testing
- ✅ Prepare your message templates
- ✅ Set up your opt-in process
- ✅ Test your integration with sandbox

**Check Status:**
- Go to **Messaging** → **WhatsApp** → **Business Accounts**
- Status will show: "Pending", "Under Review", "Approved", or "Rejected"

---

### Step 7: Get Your WhatsApp Business Number

Once approved:

1. Go to **Messaging** → **WhatsApp** → **Business Accounts**
2. You'll see your approved WhatsApp Business number
3. Copy the number (format: `whatsapp:+1234567890`)
4. This is your production WhatsApp number!

---

### Step 8: Configure in Your Application

Update your `.env.local` and production environment variables:

```env
# Replace sandbox number with your approved Business number
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

**Important:** Keep your Account SID and Auth Token the same - only the WhatsApp number changes.

---

## 📝 Message Templates (Required)

WhatsApp Business API requires you to pre-approve message templates. You'll need to create templates for:

### Common Templates You'll Need:

1. **Appointment Confirmation:**
   ```
   Template Name: appointment_confirmed
   Category: UTILITY
   
   Message:
   🎉 Appointment Confirmed!
   
   Hello {{1}},
   
   Your appointment with {{2}} has been confirmed.
   
   📅 Date: {{3}}
   ⏰ Time: {{4}}
   
   Thank you for choosing TheGodSays!
   ```

2. **Appointment Cancellation:**
   ```
   Template Name: appointment_cancelled
   Category: UTILITY
   
   Message:
   ❌ Appointment Cancelled
   
   Hello {{1}},
   
   Your appointment scheduled for {{2}} at {{3}} has been cancelled.
   
   Thank you!
   ```

### How to Create Templates:

1. Go to **Messaging** → **WhatsApp** → **Message Templates**
2. Click **"Create Template"**
3. Fill in:
   - Template Name (lowercase, underscores only)
   - Category (UTILITY, MARKETING, or AUTHENTICATION)
   - Language (English, Hindi, etc.)
   - Message Content
   - Variables ({{1}}, {{2}}, etc.)
4. Submit for approval (usually approved within 24-48 hours)

---

## 🔧 Updating Your Code

Once you have your approved WhatsApp Business number, update your code:

### Option 1: Use Template Messages (Recommended)

Update `src/lib/twilio.js`:

```javascript
/**
 * Send WhatsApp message via Twilio using templates
 */
export async function sendWhatsAppTemplate(to, templateName, variables = []) {
  try {
    const client = getTwilioClient()
    const from = process.env.TWILIO_WHATSAPP_NUMBER

    if (!from) {
      throw new Error('TWILIO_WHATSAPP_NUMBER environment variable is not set')
    }

    const formattedTo = formatPhoneNumber(to)
    const whatsappTo = formattedTo.startsWith('whatsapp:') 
      ? formattedTo 
      : `whatsapp:${formattedTo}`
    
    const whatsappFrom = from.startsWith('whatsapp:') 
      ? from 
      : `whatsapp:${from}`

    // Use template for approved messages
    const result = await client.messages.create({
      contentSid: `HX${templateSid}`, // Template SID from Twilio
      from: whatsappFrom,
      to: whatsappTo,
      contentVariables: JSON.stringify({
        [templateName]: variables
      })
    })

    return {
      success: true,
      messageSid: result.sid,
      status: result.status
    }
  } catch (error) {
    console.error('Twilio WhatsApp Template Error:', error)
    throw new Error(`Failed to send WhatsApp template: ${error.message}`)
  }
}

/**
 * Send free-form WhatsApp message (24-hour window)
 * Only works if user has messaged you in last 24 hours
 */
export async function sendWhatsApp(to, message) {
  // ... existing code ...
}
```

### Option 2: Keep Current Implementation

Your current `sendWhatsApp` function will work, but:
- ✅ Can only send to users who messaged you in last 24 hours
- ✅ For new users, you must use approved templates first
- ✅ After user replies, you have 24-hour window for free-form messages

---

## 📊 Best Practices

### 1. Template Message Flow

```
User Books Appointment
    ↓
Send Template Message (appointment_confirmed)
    ↓
User Replies (starts 24-hour session)
    ↓
Can send free-form messages for 24 hours
    ↓
After 24 hours, must use templates again
```

### 2. Opt-in Requirements

**Important:** Users must opt-in to receive WhatsApp messages.

**Add to your booking flow:**
```javascript
// In appointment booking page
const [whatsappOptIn, setWhatsappOptIn] = useState(false)

// Add checkbox:
<input
  type="checkbox"
  checked={whatsappOptIn}
  onChange={(e) => setWhatsappOptIn(e.target.checked)}
/>
<label>I agree to receive WhatsApp notifications about my appointments</label>
```

### 3. Message Limits

- **Template Messages:** Unlimited (but must be pre-approved)
- **Session Messages:** 1,000 per month per user (free tier)
- **Rate Limits:** 1,000 messages per second per number

---

## 🚨 Common Issues & Solutions

### Issue 1: Application Rejected

**Reasons:**
- Incomplete business information
- Documents don't match business details
- Unclear use case description
- Missing compliance information

**Solution:**
- Review rejection email for specific reasons
- Update your application with correct information
- Resubmit with all required documents

### Issue 2: Template Rejected

**Reasons:**
- Template violates WhatsApp policies
- Incorrect category selection
- Poor formatting

**Solution:**
- Read WhatsApp Business Policy: https://www.whatsapp.com/legal/business-policy
- Use UTILITY category for transactional messages
- Keep messages clear and professional
- Avoid promotional language in UTILITY templates

### Issue 3: Messages Not Delivering

**Check:**
1. Is the number approved? (Check Twilio Console)
2. Are you using the correct format? (`whatsapp:+1234567890`)
3. Has user opted in?
4. Is it within 24-hour window? (for free-form messages)
5. Are you using approved templates? (for new conversations)

---

## 💰 Pricing

### WhatsApp Business API Pricing (via Twilio):

**Per Message:**
- **India:** ₹0.40 - ₹0.50 per message
- **USA:** $0.005 - $0.01 per message
- **Other Countries:** Varies (check Twilio pricing)

**Free Tier:**
- 1,000 conversations per month (free)
- Each conversation = 24-hour message window

**Cost Estimate:**
- 100 appointments/month = ~200 messages = ₹80-100/month (India)
- 1,000 appointments/month = ~2,000 messages = ₹800-1,000/month (India)

---

## ✅ Checklist

Before going live:

- [ ] Twilio account upgraded (not trial)
- [ ] WhatsApp Business API application submitted
- [ ] Business verification documents uploaded
- [ ] Phone number verified
- [ ] Application approved
- [ ] Message templates created and approved
- [ ] Opt-in process implemented
- [ ] Privacy policy updated (mention WhatsApp)
- [ ] Environment variables updated
- [ ] Code updated to use Business number
- [ ] Tested with approved templates
- [ ] Error handling implemented
- [ ] Monitoring set up

---

## 📚 Additional Resources

- **Twilio WhatsApp Docs:** https://www.twilio.com/docs/whatsapp
- **WhatsApp Business Policy:** https://www.whatsapp.com/legal/business-policy
- **Twilio Support:** https://support.twilio.com/
- **Template Guidelines:** https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Twilio Console** → **Monitor** → **Logs** → **Messaging**
2. **Review Error Codes:** https://www.twilio.com/docs/api/errors
3. **Contact Twilio Support:** Available in console (for paid accounts)
4. **WhatsApp Business Support:** Through Twilio (they handle WhatsApp API)

---

## 🎯 Quick Start Summary

1. **Upgrade Twilio Account** (add payment method)
2. **Apply for WhatsApp Business API** (fill application form)
3. **Submit Business Documents** (verification)
4. **Wait for Approval** (2-4 weeks)
5. **Create Message Templates** (get approved)
6. **Update Environment Variables** (use Business number)
7. **Test & Go Live!**

Good luck with your application! 🚀

