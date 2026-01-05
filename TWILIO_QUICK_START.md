# Twilio Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Twilio Credentials

1. Sign up at https://www.twilio.com/try-twilio (free $15.50 credit)
2. Go to https://console.twilio.com/
3. Copy your **Account SID** and **Auth Token** from the dashboard

### Step 2: Get Phone Numbers

**For SMS (OTP):**
1. Go to **Phone Numbers** → **Buy a number**
2. Select your country and buy a number
3. Copy the phone number (e.g., `+1234567890`)
4. ⚠️ **Important**: This must be a DIFFERENT number from WhatsApp!

**For WhatsApp:**
1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Copy the sandbox number (e.g., `whatsapp:+14155238886`)
3. Join the sandbox by sending the join code via WhatsApp
4. ⚠️ **Note**: The WhatsApp sandbox number CANNOT be used for SMS!

### Step 3: Add to .env.local

Create or update `.env.local` in your project root:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Step 4: Test

1. Restart your dev server: `npm run dev`
2. Try booking an appointment
3. Check your phone for OTP and WhatsApp messages

## ✅ That's It!

The system is now configured. For detailed setup, see `TWILIO_SETUP_GUIDE.md`.

## 🔧 Troubleshooting

**Error: "Mismatch between the 'From' number" (Code 21660)?**
- ⚠️ **Common Issue**: You're using WhatsApp number for SMS
- **Fix**: See `TWILIO_FIX_PHONE_NUMBER.md` for detailed instructions
- **Quick Fix**: Buy a separate phone number for SMS in Twilio Console

**OTP not received?**
- Check Twilio Console → Monitor → Logs
- Verify your phone number in Twilio (trial accounts only send to verified numbers)
- Check environment variables are set correctly
- Make sure you're using a purchased SMS number, not WhatsApp number

**WhatsApp not working?**
- Ensure you've joined the WhatsApp sandbox
- Check `TWILIO_WHATSAPP_NUMBER` includes `whatsapp:` prefix
- Verify recipient has also joined the sandbox

**Development Mode:**
- If Twilio is not configured, OTP/WhatsApp will be logged to console
- This allows testing without actual SMS/WhatsApp delivery

## 📚 More Help

- Full setup guide: `TWILIO_SETUP_GUIDE.md`
- Twilio Console: https://console.twilio.com/
- Twilio Docs: https://www.twilio.com/docs

