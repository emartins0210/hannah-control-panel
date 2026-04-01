# Setup Checklist - Hannah AI Protection System

**Last Updated:** March 25, 2026  
**Status:** System is ready to run - awaiting credentials

## 🔴 CRITICAL: System Cannot Start Without These Variables

The Hannah AI system will **NOT START** without these three credentials. The system will fail at startup with clear error messages showing exactly what is missing.

### Step 1: Get VAPI_API_KEY ✓ MUST DO THIS FIRST

1. Go to: https://dashboard.vapi.ai
2. Login with your Vapi account
3. Click **Settings** in the top-right menu
4. Click **API Keys** tab
5. Copy your API key (starts with something like `sk-...`)
6. Add to `.env` file:
   ```
   VAPI_API_KEY=your_actual_api_key_here
   ```

**Why it's critical:** The system makes outbound calls to leads using Vapi. Without this key, Hannah cannot call anyone.

**Current status:** ❌ MISSING - System will not start

---

### Step 2: Get WHATSAPP_BUSINESS_TOKEN ✓ MUST DO THIS SECOND

1. Go to: https://business.facebook.com
2. Login with your Facebook Business account
3. Go to **Settings** → **Apps and Websites** → **Messenger Platform**
4. Select your WhatsApp app
5. In **Generate Access Token** section, click **Generate Token**
6. Copy the token (long alphanumeric string starting with `EAAx...`)
7. Add to `.env` file:
   ```
   WHATSAPP_BUSINESS_TOKEN=your_token_here
   ```

**Why it's critical:** This allows Hannah to send WhatsApp notifications to clients when they book a cleaning service.

**Current status:** ❌ MISSING - System will not start

---

### Step 3: Get WHATSAPP_PHONE_ID ✓ MUST DO THIS THIRD

1. Go to: https://business.facebook.com
2. Go to **Settings** → **Apps and Websites** → **Messenger Platform**
3. Under **Phone Numbers**, find your WhatsApp Business phone number
4. Copy the **Phone Number ID** (not the phone number itself - it's a long ID number)
5. Add to `.env` file:
   ```
   WHATSAPP_PHONE_ID=your_phone_number_id_here
   ```

**Why it's critical:** This tells the system which phone number to send WhatsApp messages from.

**Current status:** ❌ MISSING - System will not start

---

### Step 4: Verify These Are Already Set

These should already be configured. Check that `.env` contains:

```
JWT_SECRET=[should have a value]
ADMIN_SECRET=[should have a value]
VAPI_PHONE_NUMBER_ID=e87df653-d8c7-45a9-a7bc-abe8e16969f8
```

**Current status:** ✅ ALREADY SET

---

## Optional: Fully Backup Your Credentials

Once you have all three credentials in your `.env` file, run:

```bash
node -e "const backup = require('./modules/env-backup'); backup.backupCriticalVars();"
```

This creates an encrypted backup file at `backups/.env.backup` so you never lose credentials again.

---

## ✅ System Startup Validation

Once you add the three credentials above, when you start the server:

```bash
node server.js
```

You should see:

```
✓ VAPI_API_KEY is configured
✓ WHATSAPP_BUSINESS_TOKEN is configured  
✓ WHATSAPP_PHONE_ID is configured
✓ JWT_SECRET is configured
✓ ADMIN_SECRET is configured
✓ All critical environment variables validated successfully
Server running on port 3000
```

If ANY credential is missing, you'll see:

```
✗ VAPI_API_KEY is missing or invalid. Get it from: https://dashboard.vapi.ai/settings
✗ System cannot start without critical credentials.
```

---

## 🔧 Complete End-to-End Test Flow

Once the system starts successfully:

### 1. Test Form Submission → Hannah Call

1. Go to: https://lopesservices.top/form
2. Fill out the form:
   - **Name:** Test Client
   - **Phone:** Your phone number
   - **Service:** Any option
   - **Bedrooms:** 3
   - Click **Submit**

3. Wait 5 seconds - Hannah should call you immediately
4. Answer and have a conversation in Portuguese
5. When call ends, you should receive a WhatsApp message in ~10 seconds

### 2. Verify WhatsApp Message

- **Recipient:** Your phone number from the form
- **Sender:** The WhatsApp Business number configured in step 3
- **Content:** Should say something like:
  ```
  Olá! Uma limpeza foi agendada com sucesso!
  Cliente: [Name from form]
  Serviço: [Service selected]
  Hora: [Time]
  ```

### 3. Check Fabiola Notification

- Fabiola (+5519994294406) should receive a WhatsApp message with:
  ```
  NOVO CLIENTE!
  Nome: [Name]
  Telefone: [Phone]
  Serviço: [Service]
  ```

---

## 🛡️ Protection System Status

### What's Already Protected

- **Startup Validation** ✅ Created
  - App won't start if critical vars missing
  - Clear error messages show exactly what's wrong
  
- **Backup System** ✅ Created
  - Encrypted backup of all credentials
  - Can restore if variables ever disappear
  
- **Health Monitoring** ✅ Ready
  - Checks critical vars at startup
  - Verifies Vapi and WhatsApp connectivity

### How to Use Protection System

**Backup credentials now:**
```bash
node -e "require('./modules/env-backup').backupCriticalVars();"
```

**Check backup status:**
```bash
node -e "const b = require('./modules/env-backup'); console.log(b.checkBackupIntegrity());"
```

**Restore from backup if needed:**
```bash
node -e "require('./modules/env-backup').restoreFromBackup();"
```

---

## 🚨 Troubleshooting

### "VAPI_API_KEY is missing"
- Go to https://dashboard.vapi.ai/settings
- Copy your API key
- Add to `.env`: `VAPI_API_KEY=your_key`
- Restart server

### "WHATSAPP_BUSINESS_TOKEN is missing"
- Go to https://business.facebook.com
- Settings → Messenger Platform → Generate Token
- Copy the token (starts with `EAAx...`)
- Add to `.env`: `WHATSAPP_BUSINESS_TOKEN=token`
- Restart server

### "WHATSAPP_PHONE_ID is missing"
- Go to https://business.facebook.com
- Settings → Messenger Platform → Phone Numbers
- Copy the Phone Number ID (the ID, not the number)
- Add to `.env`: `WHATSAPP_PHONE_ID=id`
- Restart server

### "Hannah called but no WhatsApp message received"
- Check `.env` has correct `WHATSAPP_PHONE_ID`
- Verify WhatsApp Business phone number is active
- Check WhatsApp Business token is still valid (may need refresh)

### "Form submission worked but Hannah didn't call"
- Check `VAPI_API_KEY` is correct
- Check server logs for Vapi API errors
- Verify `VAPI_PHONE_NUMBER_ID=e87df653-d8c7-45a9-a7bc-abe8e16969f8` in `.env`

---

## 📋 Pre-Launch Checklist

Before going live, ensure:

- [ ] `VAPI_API_KEY` added to `.env`
- [ ] `WHATSAPP_BUSINESS_TOKEN` added to `.env`
- [ ] `WHATSAPP_PHONE_ID` added to `.env`
- [ ] Server starts without errors
- [ ] Form submission → Hannah call works
- [ ] WhatsApp message received by client
- [ ] WhatsApp notification sent to Fabiola
- [ ] Backup created with `env-backup.js`
- [ ] This checklist reviewed and printed

---

## 📞 Need Help?

If any credential is missing or invalid, the system will display clear error messages at startup showing:
1. Which variables are missing
2. Where to get each credential
3. What to add to `.env`

The system is designed to **fail loudly and clearly** so you never have silent failures again.
