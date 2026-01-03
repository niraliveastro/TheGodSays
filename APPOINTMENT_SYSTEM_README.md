# Appointment Booking System - Implementation Guide

## Overview

A comprehensive appointment booking system has been implemented for TheGodSays platform, allowing users to book appointments with astrologers based on their availability. The system includes phone number verification via OTP, availability management for astrologers, booking functionality for users, and WhatsApp notifications.

## Features Implemented

### 1. Phone Number Verification (OTP)
- **API Endpoints:**
  - `POST /api/otp/send` - Send OTP to phone number
  - `POST /api/otp/verify` - Verify OTP and mark phone as verified
- **Component:** `src/components/PhoneVerification.jsx`
- **Features:**
  - 6-digit OTP generation
  - 10-minute expiry
  - Maximum 5 verification attempts
  - Automatic phone number verification status update in user/astrologer profile
  - Resend OTP with countdown timer

### 2. Appointment Availability Management
- **API Endpoints:**
  - `GET /api/appointments/availability?astrologerId={id}` - Get availability slots
  - `POST /api/appointments/availability` - Add/update availability slots
  - `DELETE /api/appointments/availability` - Remove availability slots
- **Page:** `src/app/appointments/availability/page.js`
- **Features:**
  - Astrologers can add multiple time slots with date, time, and duration
  - Automatic filtering of past slots
  - Duplicate slot prevention
  - Grouped display by date
  - Phone verification required before managing availability

### 3. Appointment Booking
- **API Endpoints:**
  - `POST /api/appointments/book` - Book an appointment
  - `GET /api/appointments?userId={id}` or `?astrologerId={id}` - Get appointments
  - `PUT /api/appointments` - Update appointment status (cancel, complete, etc.)
- **Page:** `src/app/appointments/book/[astrologerId]/page.js`
- **Features:**
  - Users can view available slots for an astrologer
  - Date and time selection interface
  - Optional notes field
  - Phone verification required before booking
  - Automatic WhatsApp notifications on booking confirmation
  - Duplicate booking prevention

### 4. Appointment Management
- **Page:** `src/app/appointments/page.js`
- **Features:**
  - View all appointments (for both users and astrologers)
  - Filter by status: all, upcoming, past, cancelled
  - Cancel appointments
  - Connect to appointment (redirects to call interface)
  - Shows appointment details: date, time, duration, notes, participant names

### 5. WhatsApp Notifications
- **API Endpoint:** `POST /api/whatsapp/notify`
- **Features:**
  - Sends confirmation messages to both user and astrologer on booking
  - Sends cancellation notifications
  - Formatted messages with appointment details
  - **Note:** Currently logs messages (for development). In production, integrate with:
    - Twilio WhatsApp API
    - WhatsApp Business API
    - MessageBird WhatsApp API
    - Or any other WhatsApp service provider

## Database Structure

### Collections

1. **otp_verifications**
   - Document ID: `{userType}_{userId}`
   - Fields: `phoneNumber`, `otp`, `userId`, `userType`, `expiresAt`, `verified`, `attempts`, `createdAt`, `verifiedAt`

2. **appointment_availability**
   - Document ID: `{astrologerId}`
   - Fields: `astrologerId`, `slots` (array), `updatedAt`
   - Slot structure: `{ date, time, duration, createdAt }`

3. **appointments**
   - Document ID: auto-generated
   - Fields: `id`, `userId`, `astrologerId`, `date`, `time`, `duration`, `status`, `notes`, `userPhone`, `astrologerPhone`, `userName`, `astrologerName`, `createdAt`, `updatedAt`

4. **users** / **astrologers** (updated)
   - New fields: `phoneNumber`, `phoneVerified`, `phoneVerifiedAt`

## User Flow

### For Users:
1. Browse astrologers on profile page
2. Click "Book Appointment" button
3. Verify phone number (if not already verified)
4. Select available date and time slot
5. Add optional notes
6. Confirm booking
7. Receive WhatsApp confirmation
8. View appointments in `/appointments` page
9. Connect at scheduled time or cancel if needed

### For Astrologers:
1. Go to dashboard
2. Click "Manage Availability"
3. Verify phone number (if not already verified)
4. Add available time slots (date, time, duration)
5. Save availability
6. Receive WhatsApp notifications for new bookings
7. View appointments in `/appointments` page
8. Connect with users at scheduled time

## Integration Points

### Astrologer Profile Page
- Added "Book Appointment" button next to call buttons
- Button redirects to `/appointments/book/{astrologerId}`

### Astrologer Dashboard
- Added "Manage Availability" button in header
- Links to `/appointments/availability`

## Environment Variables

**Required for Twilio Integration:**

```env
# Twilio Configuration (Required for SMS and WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Setup Instructions:**
- See `TWILIO_SETUP_GUIDE.md` for detailed setup instructions
- Get credentials from: https://console.twilio.com/
- For development, system will log OTP/WhatsApp messages if Twilio is not configured

## Production Checklist

### Before Going Live:

1. **Twilio Setup:**
   - [ ] Create Twilio account at https://www.twilio.com/try-twilio
   - [ ] Get Account SID and Auth Token from Twilio Console
   - [ ] Purchase/verify a phone number for SMS
   - [ ] Set up WhatsApp Sandbox or Business API
   - [ ] Add all environment variables to `.env.local` and production
   - [ ] Test OTP delivery
   - [ ] Test WhatsApp delivery
   - [ ] See `TWILIO_SETUP_GUIDE.md` for detailed instructions

3. **Phone Number Validation:**
   - [ ] Implement proper phone number format validation
   - [ ] Add country code support
   - [ ] Handle international numbers

4. **Security:**
   - [ ] Review Firestore security rules for new collections
   - [ ] Add rate limiting for OTP requests
   - [ ] Implement CAPTCHA for OTP requests (optional)
   - [ ] Add appointment booking rate limits

5. **Testing:**
   - [ ] Test complete booking flow
   - [ ] Test cancellation flow
   - [ ] Test phone verification flow
   - [ ] Test availability management
   - [ ] Test WhatsApp notifications
   - [ ] Test edge cases (overlapping slots, past dates, etc.)

6. **Firestore Indexes:**
   - [ ] Create composite indexes if needed for queries
   - [ ] Check Firestore console for index requirements

7. **Error Handling:**
   - [ ] Add proper error messages for all failure scenarios
   - [ ] Implement retry logic for failed notifications
   - [ ] Add logging for debugging

## API Documentation

### OTP APIs

#### Send OTP
```http
POST /api/otp/send
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "userId": "user123",
  "userType": "user" // or "astrologer"
}
```

#### Verify OTP
```http
POST /api/otp/verify
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "userId": "user123",
  "userType": "user",
  "otp": "123456"
}
```

### Appointment APIs

#### Get Availability
```http
GET /api/appointments/availability?astrologerId=astrologer123
```

#### Add/Update Availability
```http
POST /api/appointments/availability
Content-Type: application/json

{
  "astrologerId": "astrologer123",
  "slots": [
    {
      "date": "2024-12-25",
      "time": "14:00",
      "duration": 30
    }
  ]
}
```

#### Book Appointment
```http
POST /api/appointments/book
Content-Type: application/json

{
  "userId": "user123",
  "astrologerId": "astrologer123",
  "date": "2024-12-25",
  "time": "14:00",
  "duration": 30,
  "notes": "Want to discuss career"
}
```

#### Get Appointments
```http
GET /api/appointments?userId=user123
GET /api/appointments?astrologerId=astrologer123
GET /api/appointments?userId=user123&status=confirmed
```

#### Update Appointment
```http
PUT /api/appointments
Content-Type: application/json

{
  "appointmentId": "appt123",
  "status": "cancelled",
  "userId": "user123"
}
```

## Troubleshooting

### OTP Not Received
- Check console logs (in development, OTP is logged)
- Verify phone number format
- Check SMS service configuration
- Review rate limiting

### Appointment Booking Fails
- Ensure phone number is verified
- Check if slot is still available
- Verify astrologer has verified phone number
- Check for duplicate bookings

### WhatsApp Notifications Not Sent
- Check WhatsApp service configuration
- Verify phone numbers are in correct format
- Review API logs for errors
- Ensure service provider credentials are correct

## Future Enhancements

1. **Recurring Appointments:** Allow users to book recurring sessions
2. **Appointment Reminders:** Send reminders before appointment time
3. **Rescheduling:** Allow users/astrologers to reschedule appointments
4. **Calendar Integration:** Sync with Google Calendar, Outlook, etc.
5. **Time Zone Support:** Handle different time zones
6. **Multiple Languages:** Support for multiple languages in notifications
7. **Appointment Reviews:** Allow users to review appointments
8. **Payment Integration:** Charge for appointments upfront
9. **Waitlist:** Add waitlist for fully booked astrologers
10. **Analytics:** Track booking patterns and availability utilization

## Support

For issues or questions, please refer to the main project documentation or contact the development team.

