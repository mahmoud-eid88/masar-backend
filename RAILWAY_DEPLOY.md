# Masar Backend - Railway Deployment Guide

## Quick Start: Deploy via Railway Dashboard

Since Railway CLI is not installed, follow these steps to deploy via the Railway web interface:

### Step 1: Prepare the Code

The backend code is ready for deployment at: `d:\masar11\masar-backend`

### Step 2: Create New Service on Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Open your existing project (where the PostgreSQL database is)
3. Click **"New Service"** → **"Empty Service"**
4. Name it: `masar-backend`

### Step 3: Deploy from Local Folder

**Option A: Via GitHub (Recommended)**
1. Initialize git in the backend folder (if not already):
   ```bash
   cd d:\masar11\masar-backend
   git init
   git add .
   git commit -m "Initial backend commit"
   ```
2. Push to GitHub repository
3. In Railway, click **"Connect Repo"** and select your repository

**Option B: Via Railway CLI (Install First)**
1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
2. Login and link:
   ```bash
   railway login
   railway link
   railway up
   ```

### Step 4: Configure Environment Variables

In Railway service settings, add these variables (from your `.env`):

```
PORT=5000
NODE_ENV=production
DB_HOST=nozomi.proxy.rlwy.net
DB_USER=postgres
DB_PASSWORD=zXWsvZoYVvCqThUUrvNiPLAQKcgoQytG
DB_NAME=railway
DB_PORT=29743
DATABASE_URL=postgresql://postgres:zXWsvZoYVvCqThUUrvNiPLAQKcgoQytG@nozomi.proxy.rlwy.net:29743/railway
JWT_SECRET=masar_secret_key_2026
```

### Step 5: Generate Domain

1. In Railway service settings, go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Copy the domain (e.g., `masar-backend-production.up.railway.app`)

### Step 6: Verify Deployment

Test the API:
```
https://[your-domain].up.railway.app/
```

Expected response: `{"message":"Welcome to Masar API"}`

### Step 7: Update App Configuration (If Needed)

If the generated domain is different from `masar-backend.up.railway.app`, update the Flutter apps and rebuild.

---

**Current Status:** Ready to deploy - all code is prepared and database is configured.
