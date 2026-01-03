# Fix: Twilio Phone Number Error (21660)

## 🔴 Error You're Seeing

```
Error: Mismatch between the 'From' number +14155238886 and the account
Error code: 21660
```

## ✅ What This Means

You're trying to use the **WhatsApp sandbox number** (`+14155238886`) for **SMS**, but this number can only be used for WhatsApp messages, not SMS.

**SMS and WhatsApp require different phone numbers in Twilio!**

## 🛠️ How to Fix

### Step 1: Get a Phone Number for SMS

1. Go to **Twilio Console**: https://console.twilio.com/
2. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
3. Click **Buy a number**
4. Select:
   - **Country**: Choose your country (e.g., India, USA)
   - **Capabilities**: Make sure **SMS** is checked
   - **Voice**: Optional (not needed for OTP)
5. Click **Search** and choose a number
6. Click **Buy** (free trial accounts get one free number)

### Step 2: Update Your .env.local

Replace the `TWILIO_PHONE_NUMBER` with the number you just purchased:

```env
# OLD (Wrong - This is WhatsApp sandbox number)
TWILIO_PHONE_NUMBER=+14155238886

# NEW (Correct - Your purchased SMS number)
TWILIO_PHONE_NUMBER=+1234567890
```

**Example for India:**
```env
TWILIO_PHONE_NUMBER=+919876543210
```

**Example for USA:**
```env
TWILIO_PHONE_NUMBER=+15551234567
```

### Step 3: Keep WhatsApp Number Separate

Your WhatsApp number should remain as:
```env
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

This is correct - the WhatsApp sandbox number is fine for WhatsApp.

### Step 4: Restart Your Server

After updating `.env.local`:
```bash
# Stop your server (Ctrl+C)
# Then restart
npm run dev
```

## 📋 Complete .env.local Example

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# SMS Number (for OTP) - Must be a purchased Twilio number
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Number (for notifications) - Can be sandbox or business number
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## ✅ Verify It's Working

1. Restart your server
2. Try sending an OTP again
3. Check your phone for the SMS
4. Check Twilio Console → **Monitor** → **Logs** → **Messaging** for delivery status

## 🆓 Free Trial Notes

- **Free trial accounts** can only send SMS to **verified phone numbers**
- To verify a number: Twilio Console → **Phone Numbers** → **Verified Caller IDs**
- Add your phone number there to receive test SMS

## ❓ Still Having Issues?

1. **Check Twilio Console** → **Phone Numbers** → **Manage** → **Active numbers**
   - Make sure your SMS number is listed there
   - Copy the exact number (including country code)

2. **Verify the number format** in `.env.local`:
   - Must start with `+`
   - Must include country code
   - Example: `+919876543210` (India) or `+15551234567` (USA)

3. **Check error logs** in Twilio Console:
   - Go to **Monitor** → **Logs** → **Messaging**
   - Look for detailed error messages

## 📚 Quick Reference

- **SMS (OTP)**: Use a purchased Twilio phone number
- **WhatsApp**: Use WhatsApp sandbox number or Business API number
- **They are different!** You need both numbers.

