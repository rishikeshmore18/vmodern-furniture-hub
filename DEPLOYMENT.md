# Deployment Guide

This project is configured with GitHub Actions to automatically deploy to GitHub Pages when you push changes to the `main` or `master` branch.

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository on GitHub: https://github.com/rishikeshmore18/vmodern-furniture-hub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
4. Save the settings

### 2. Push Your Code

The deployment workflow will automatically trigger when you:

- Push to the `main` or `master` branch
- Manually trigger it from the **Actions** tab in GitHub

### 3. View Your Deployment

After the workflow completes:

1. Go to the **Actions** tab in your repository
2. Click on the latest workflow run
3. Once it's complete, your site will be available at:
   ```
   https://rishikeshmore18.github.io/vmodern-furniture-hub/
   ```

## Manual Deployment

You can also manually trigger a deployment:

1. Go to the **Actions** tab in your repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

## Local Development

For local development, the base path is set to `/`, so you can run:

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Build for Production

To build locally:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Booking Email Notifications

The booking form calls the `book-appointment` Supabase Edge Function. That function saves the appointment first, then attempts to email the store at `Furniture1141@yahoo.com`.

Configure one of these email options in Supabase project secrets:

### Preferred: API email provider with your Zoho-domain sender

Use this when your Zoho domain email is verified with an email API provider such as Resend.

```bash
RESEND_API_KEY=your_api_key
BOOKING_EMAIL_FROM="Vmodern Furniture <appointments@yourdomain.com>"
BOOKING_NOTIFY_EMAIL=Furniture1141@yahoo.com
```

### Fallback: Zoho SMTP

Use this if SMTP is available from the deployed Edge Function environment.

```bash
ZOHO_SMTP_USER=appointments@yourdomain.com
ZOHO_SMTP_PASSWORD=your_zoho_app_password
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=465
ZOHO_SMTP_TLS=true
BOOKING_EMAIL_FROM="Vmodern Furniture <appointments@yourdomain.com>"
BOOKING_NOTIFY_EMAIL=Furniture1141@yahoo.com
```

If email delivery fails, the appointment remains saved and the customer still sees the normal success message.

## Troubleshooting

- **404 errors on GitHub Pages**: Make sure GitHub Pages is set to use "GitHub Actions" as the source, not a branch
- **Assets not loading**: The base path is automatically configured for GitHub Pages during the build process
- **Workflow not running**: Check that you've pushed to the `main` or `master` branch, or manually trigger it from the Actions tab

