# Masar Backend - Fast Railway Deployment Guide

To make the app work on your mobile phone from anywhere, follow these 3 simple steps:

### Step 1: Push Code to GitHub (If not done)
Make sure the folder `masar-backend` is pushed to a GitHub repository.

### Step 2: Create Service on Railway
1. Go to [Railway Dashboard](https://railway.app/dashboard).
2. Click **"New"** -> **"GitHub Repo"** and select your `masar-backend` repository.

### Step 3: Add Variables & Domain
1. In the new service, go to **Settings** -> **Variables**.
2. Add these variables (exactly as shown):
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `masar_secret_key_2026`
   - `DATABASE_URL`: `postgresql://postgres:zXWsvZoYVvCqThUUrvNiPLAQKcgoQytG@nozomi.proxy.rlwy.net:29743/railway`
   - `SYNC_DB`: `true` ⚠️ **IMPORTANT: Required for first deployment to create database tables**
3. Go to **Settings** -> **Networking** and click **"Generate Domain"**.

**Once you have the domain (e.g., `masar-backend.up.railway.app`), send it to me!** I will then update the app code for you.

> **Note:** After the first successful deployment and database sync, you can optionally remove `SYNC_DB` or set it to `false` to prevent automatic schema changes on future deployments.
