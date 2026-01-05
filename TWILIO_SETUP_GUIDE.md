# Twilio Integration Setup Guide

This guide will help you set up Twilio for OTP (SMS) and WhatsApp messaging in TheGodSays.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com/try-twilio)
2. A verified phone number or Twilio phone number
3. For WhatsApp: Twilio WhatsApp Sandbox or approved WhatsApp Business Account

## Step 1: Create a Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account (includes $15.50 credit for testing)
3. Verify your email and phone number

## Step 2: Get Your Twilio Credentials

1. Log in to your Twilio Console: https://console.twilio.com/
2. Navigate to **Account** → **API Keys & Tokens**
3. You'll find:
   - **Account SID**: Starts with `AC...`
   - **Auth Token**: Click "View" to reveal it

## Step 3: Get a Twilio Phone Number (for SMS/OTP)

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select your country (e.g., India, USA)
3. Choose a number with SMS capabilities
4. Purchase the number (free trial accounts get one free number)
5. Note the phone number (e.g., `+1234567890`)

## Step 4: Set Up WhatsApp (Optional but Recommended)

### Option A: Twilio WhatsApp Sandbox (Free for Testing)

1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see a sandbox number (e.g., `whatsapp:+14155238886`)
3. Follow the instructions to join the sandbox:
   - Send the join code to the sandbox number via WhatsApp
   - Example: Send `join <code>` to `whatsapp:+14155238886`
4. Once joined, you can send messages to any number that has joined the sandbox

**Note:** Sandbox is for testing only. For production, you need Option B.

### Option B: WhatsApp Business API (Production)

**📖 Detailed Guide:** See `WHATSAPP_BUSINESS_API_SETUP.md` for complete step-by-step instructions.

**Quick Steps:**
1. Upgrade your Twilio account (add payment method)
2. Go to **Messaging** → **WhatsApp** → **Get Started with WhatsApp Business API**
3. Fill out the application form with business details
4. Submit business verification documents (registration, tax ID, etc.)
5. Wait for approval (typically 2-4 weeks)
6. Create and get message templates approved
7. Use your approved WhatsApp Business number

**Note:** This process requires business verification and can take several weeks. Use the sandbox for testing while waiting.

## Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### For Production (Vercel/Other Hosting):

1. **Vercel:**
   - Go to your project settings
   - Navigate to **Environment Variables**
   - Add each variable above

2. **Other Hosting:**
   - Add environment variables through your hosting platform's dashboard
   - Ensure they're available at build time

## Step 6: Install Twilio SDK

The Twilio SDK is already included in the project. If you need to reinstall:

```bash
npm install twilio
```

## Step 7: Test the Integration

### Test OTP (SMS)

1. Start your development server: `npm run dev`
2. Navigate to the appointment booking page
3. Enter a phone number (must be verified in Twilio for trial accounts)
4. Request an OTP
5. Check your phone for the SMS

### Test WhatsApp

1. Join the Twilio WhatsApp Sandbox (if using sandbox)
2. Book an appointment
3. Check WhatsApp for the notification

## Phone Number Format

The system automatically formats phone numbers to E.164 format:
- Indian numbers: `+919876543210` (10 digits after +91)
- US numbers: `+1234567890`
- Other countries: Include country code with `+`

## Troubleshooting

### OTP Not Received

1. **Check Twilio Console:**
   - Go to **Monitor** → **Logs** → **Messaging**
   - Check for error messages

2. **Verify Phone Number:**
   - Trial accounts can only send to verified numbers
   - Verify your number in Twilio Console

3. **Check Environment Variables:**
   - Ensure all Twilio variables are set correctly
   - Restart your server after adding variables

4. **Check Phone Number Format:**
   - Ensure phone numbers are in correct format
   - Include country code

### WhatsApp Not Working

1. **Sandbox Issues:**
   - Ensure recipient has joined the sandbox
   - Check sandbox number is correct
   - Verify `TWILIO_WHATSAPP_NUMBER` includes `whatsapp:` prefix

2. **Production Issues:**
   - Ensure WhatsApp Business API is approved
   - Check business verification status
   - Verify phone number is approved for WhatsApp

3. **Error Messages:**
   - Check Twilio Console logs
   - Common errors:
     - `21211`: Invalid phone number
     - `21608`: Number not opted in (WhatsApp)
     - `21408`: Permission denied

### Development Mode

If Twilio is not configured, the system will:
- Log OTP to console (development only)
- Log WhatsApp messages to console (development only)
- Still allow testing without actual SMS/WhatsApp delivery

## Twilio Pricing

### SMS (OTP)
- **Trial Account:** Free credits ($15.50)
- **Pay-as-you-go:** ~$0.0075 per SMS (varies by country)
- **India:** ~₹0.50 per SMS

### WhatsApp
- **Sandbox:** Free for testing
- **Production:** ~$0.005 per message (varies)
- **India:** ~₹0.40 per message

## Security Best Practices

1. **Never commit credentials:**
   - Keep `.env.local` in `.gitignore`
   - Use environment variables in production

2. **Rotate credentials:**
   - Regularly update Auth Token
   - Use API Keys instead of Auth Token when possible

3. **Rate limiting:**
   - Implement rate limiting for OTP requests
   - Prevent abuse and reduce costs

4. **Monitor usage:**
   - Set up Twilio usage alerts
   - Monitor costs regularly

## Production Checklist

Before going live:

- [ ] Upgrade from trial account
- [ ] Verify all phone numbers
- [ ] Set up WhatsApp Business API (if using WhatsApp)
- [ ] Configure production environment variables
- [ ] Test OTP delivery
- [ ] Test WhatsApp delivery
- [ ] Set up usage alerts
- [ ] Implement rate limiting
- [ ] Monitor error logs
- [ ] Set up webhooks for delivery status (optional)

## Support

- **Twilio Documentation:** https://www.twilio.com/docs
- **Twilio Support:** https://support.twilio.com/
- **WhatsApp Business API:** https://www.twilio.com/docs/whatsapp

## Additional Resources

- **Twilio Console:** https://console.twilio.com/
- **Phone Number Lookup:** https://www.twilio.com/lookup
- **Messaging Logs:** https://console.twilio.com/us1/monitor/logs/messaging
- **WhatsApp Sandbox:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

