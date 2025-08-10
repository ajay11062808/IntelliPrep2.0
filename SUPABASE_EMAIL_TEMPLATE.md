# 📧 Supabase Email Template Configuration

## 🎯 Email Template for "Confirm signup"

### Subject Line:
```
Welcome to IntelliPrep! Confirm Your Email Address
```

### Important: RedirectTo vs SiteURL

- If you are passing a custom `emailRedirectTo` from the client (we do: `intelliprep20://email-confirmation`), you should use `{{ .RedirectTo }}` in your template instead of `{{ .SiteURL }}`.
- Supabase will construct `{{ .ConfirmationURL }}` correctly for you. Using `{{ .ConfirmationURL }}` is the safest choice and automatically respects `RedirectTo`.

Recommended options (pick ONE):
- Simplest: use `{{ .ConfirmationURL }}` directly in your button/link.
- Advanced: build the URL with `{{ .RedirectTo }}` manually, if you need a custom path.

### Email Body (HTML) — using ConfirmationURL (recommended)
```html
<a href="{{ .ConfirmationURL }}" class="button">Confirm your email</a>
```

### Email Body (HTML) — using RedirectTo explicitly
```html
<!-- Only if you need to override or build the URL manually -->
<a href="{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" class="button">Confirm your email</a>
```

### Mobile Deep Linking URIs

- Our app scheme is: `intelliprep20://`
- We pass: `emailRedirectTo: "intelliprep20://email-confirmation"` on sign up
- Ensure this is added under Authentication → Settings → Redirect URLs

Example values:
- Site URL: `https://your-app-domain.com` (web only)
- Redirect URLs:
  - `intelliprep20://email-confirmation`
  - `https://your-app-domain.com/email-confirmation`

### Error Handling (client)
Supabase returns errors in the URL fragment of the redirect, e.g. `#error_code=...&error_description=...`.
Our `app/email-confirmation.tsx` now parses these and shows a message, then tries to set the session when tokens are present.

### Full HTML Template (styled)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - IntelliPrep</title>
</head>
<body>
  <h2>Welcome to IntelliPrep!</h2>
  <p>Please confirm your email to continue.</p>
  <p>
    <a href="{{ .ConfirmationURL }}" style="background:#667eea;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">Confirm your email</a>
  </p>
  <p>If the button doesn't work, paste this link into your browser:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
</body>
</html>
```

### Plain Text Version:
```
Welcome to IntelliPrep! Confirm Your Email Address

Hi there! 👋

Thank you for joining IntelliPrep - your AI-powered study companion! We're excited to help you ace your exams and master your subjects.

To get started, please confirm your email address by clicking the link below:

{{ .ConfirmationURL }}

What happens next?
• Click the link above to verify your email
• You'll be redirected back to the IntelliPrep app
• Start exploring AI-powered study tools and features

Can't click the link? Copy and paste the URL above into your browser.

---
IntelliPrep Team

If you didn't create this account, you can safely ignore this email.
This link will expire in 24 hours for security reasons.
```

## ⚙️ **Supabase Configuration Steps**

### **1. Go to Supabase Dashboard:**
1. Navigate to your project
2. Go to **Authentication** → **Email Templates**
3. Click on **"Confirm signup"** template

### **2. Configure the Template:**
1. **Subject**: Copy the subject line above
2. **HTML Content**: Copy the HTML template above
3. **Text Content**: Copy the plain text version above
4. Click **"Save"**

### **3. Configure Redirect URLs:**
1. Go to **Authentication** → **Settings**
2. Under **"Site URL"**, add: `https://your-app-domain.com`
3. Under **"Redirect URLs"**, add:
   - `intelliprep20://email-confirmation`
   - `https://your-app-domain.com/email-confirmation`

### **4. Enable Email Confirmations:**
1. In **Authentication** → **Settings**
2. Set **"Enable email confirmations"** to **ON**
3. Set **"Enable phone confirmations"** to **OFF**

## 🎨 **Customization Options**

### **Colors:**
- Primary: `#667eea` (Blue)
- Secondary: `#764ba2` (Purple)
- Text: `#1f2937` (Dark Gray)
- Background: `#f8fafc` (Light Gray)

### **Logo:**
- Replace `🧠 IntelliPrep` with your actual logo
- You can use an image: `<img src="your-logo-url.png" alt="IntelliPrep" style="height: 40px;">`

### **Branding:**
- Update colors to match your brand
- Modify the welcome message
- Add your company address in footer

## ✅ **Testing the Email**

1. **Register a new account** in your app
2. **Check the email** that gets sent
3. **Click the confirmation link**
4. **Verify** you're redirected back to the app
5. **Confirm** the user is logged in

## 🔧 **Troubleshooting**

### **Email not sending:**
- Check Supabase project settings
- Verify email provider configuration
- Check spam folder

### **Link not working:**
- Verify redirect URLs in Supabase
- Check deep link configuration in app
- Ensure app scheme is correct (`intelliprep20://`)

### **User not confirmed:**
- Check email template variables
- Verify confirmation URL format
- Test the confirmation flow

## 🎉 **Ready to Use!**

Your email template is now configured and ready to provide a professional, branded experience for your users during the signup process.
