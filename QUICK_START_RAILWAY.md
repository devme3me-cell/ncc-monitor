# 🚀 Quick Start: Deploy to Railway in 5 Minutes

This is the fastest way to get your NCC Monitor application live on Railway.app.

## Step 1: Extract the Package (30 seconds)

```bash
tar -xzf ncc-monitor-railway-deployment.tar.gz
cd ncc-monitor
```

## Step 2: Push to GitHub (2 minutes)

### Option A: Using GitHub CLI (Fastest)

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create ncc-monitor --public --source=. --remote=origin --push
```

### Option B: Using Git + Web

1. Create repo at https://github.com/new (name it `ncc-monitor`)
2. Run:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ncc-monitor.git
git push -u origin main
```

## Step 3: Deploy to Railway (2 minutes)

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select your `ncc-monitor` repository
4. Railway will auto-detect the configuration and start building

## Step 4: Set Environment Variables (30 seconds)

Click on your service → **Variables** tab → Add:

```
NODE_ENV=production
JWT_SECRET=paste_a_random_32_character_string_here
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

Or use any random string generator (minimum 32 characters).

## Step 5: Get Your URL (Instant)

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Your app will be live at: `https://your-app.up.railway.app`

## ✅ Done!

Visit your URL and log in with:
- **Email**: `demo@user.com`
- **Password**: `password123`

---

## Optional: Add Database

If you need a database:

1. In Railway project, click **"New"** → **"Database"** → **"Add MySQL"**
2. Railway auto-creates `DATABASE_URL` variable
3. Your app connects automatically

## Optional: Custom Domain

1. Go to **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Add your domain and update DNS records

---

## Troubleshooting

**Build fails?**
- Check Railway logs
- Ensure `pnpm-lock.yaml` is committed

**App crashes?**
- Verify `JWT_SECRET` is set
- Check deployment logs for errors

**Need help?**
- See full guide: `RAILWAY_DEPLOYMENT_GUIDE.md`
- Railway docs: https://docs.railway.app

---

**Total time: ~5 minutes** ⏱️

**Your NCC Monitor is now live! 🎉**
