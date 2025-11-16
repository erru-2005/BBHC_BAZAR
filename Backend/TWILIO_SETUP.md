# Twilio SMS Setup Guide

This guide will help you configure Twilio to send OTP codes via SMS.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com)
2. A Twilio phone number (you'll get one for free in trial mode)
3. Your Twilio Account SID and Auth Token

## Step 1: Get Your Twilio Credentials

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. Navigate to the Dashboard
3. You'll find:
   - **Account SID**: Found on the dashboard (starts with `AC...`)
   - **Auth Token**: Click "Show" to reveal it (starts with your auth token)
   - **Phone Number**: Go to Phone Numbers → Manage → Active numbers (format: +1234567890)

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env` file in the `Backend` directory:

**Create or edit `Backend/.env` file:**

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:**
- The `.env` file should be in the `Backend` directory (same level as `config.py`)
- Do NOT include quotes around the values
- Do NOT include spaces around the `=` sign
- The file is automatically loaded when the app starts

**Important Notes:**
- Phone numbers must be in E.164 format: `+[country code][number]`
  - Example: `+1234567890` (US)
  - Example: `+919876543210` (India)
- Do NOT commit these credentials to version control
- Add `.env` to your `.gitignore` file

## Step 3: Install Twilio Package

The Twilio package is already added to `requirements.txt`. Install it by running:

```bash
pip install -r requirements.txt
```

Or install directly:

```bash
pip install twilio==9.0.0
```

## Step 4: Verify Phone Number Format

Make sure phone numbers in your database are stored in E.164 format:
- ✅ Correct: `+1234567890`
- ❌ Incorrect: `1234567890`, `(123) 456-7890`, `123-456-7890`

## Step 5: Test the Integration

1. Start your Flask backend
2. Try logging in with a user that has a phone number
3. Check the console logs for SMS sending status
4. In DEBUG mode, the API response will include `sms_sent` and `sms_error` fields

## Troubleshooting

### Error: "Twilio credentials not configured"
- Make sure all three environment variables are set
- Restart your Flask application after setting environment variables
- Check that variable names match exactly (case-sensitive)

### Error: "Invalid phone number"
- Ensure phone numbers are in E.164 format (`+[country code][number]`)
- Verify the phone number exists in your database
- Check that the phone number is valid

### Error: "Twilio authentication failed"
- Double-check your Account SID and Auth Token
- Make sure there are no extra spaces or quotes in the environment variables
- Verify your Twilio account is active

### SMS Not Sending
- Check your Twilio account balance (trial accounts have limits)
- Verify your Twilio phone number is active
- Check Twilio Console → Monitor → Logs for detailed error messages
- In DEBUG mode, check the API response for `sms_error` field

## Twilio Trial Account Limitations

**IMPORTANT:** If you're using a Twilio trial account:
- You can **ONLY** send SMS to **verified phone numbers**
- This is the most common cause of SMS sending failures

### How to Verify Phone Numbers:

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Verified Caller IDs**
3. Click **"Add a new Caller ID"**
4. Enter the phone number you want to verify (e.g., `+919538820068`)
5. Choose verification method:
   - **Call**: Twilio will call the number with a verification code
   - **SMS**: Twilio will send an SMS with a verification code
6. Enter the verification code when prompted
7. The number will now be verified and you can send SMS to it

### Common Error Messages:

- **Error 21608**: "Unable to create record: The number +91XXXXXXXXXX is unverified. Trial accounts cannot send messages to unverified numbers."
  - **Solution**: Verify the phone number in Twilio Console

- **Error 21211**: "Invalid 'To' Phone Number"
  - **Solution**: Check the phone number format (must be E.164: +[country code][number])

### Upgrade to Paid Account:

To send SMS to any phone number without verification:
1. Go to Twilio Console → Billing
2. Add a payment method
3. Upgrade from trial to paid account

## Production Considerations

1. **Upgrade your Twilio account** from trial to paid
2. **Set up proper error handling** and logging
3. **Monitor SMS costs** and usage
4. **Consider rate limiting** to prevent abuse
5. **Set up webhooks** for delivery status updates (optional)

## Example .env File

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Other environment variables...
SECRET_KEY=your-secret-key
MONGODB_URI=your-mongodb-uri
```

## Support

For Twilio-specific issues, refer to:
- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Python SDK](https://www.twilio.com/docs/libraries/python)
- [Twilio Support](https://support.twilio.com/)

