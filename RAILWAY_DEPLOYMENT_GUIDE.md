# Railway.app Deployment Guide for NCC Monitor

This guide will walk you through deploying the NCC Monitor application to Railway.app.

## Prerequisites

- A GitHub account
- A Railway.app account (sign up at https://railway.app)
- Git installed on your local machine

## Step 1: Push Code to GitHub

### Option A: Using GitHub CLI (Recommended)

```bash
# Navigate to your project directory
cd /path/to/ncc-monitor

# Initialize git repository
git init

# Add all files
git add .

# Commit the files
git commit -m "Initial commit - NCC Monitor application"

# Create a new GitHub repository (replace YOUR_USERNAME)
gh repo create ncc-monitor --public --source=. --remote=origin

# Push to GitHub
git push -u origin main
```

### Option B: Using GitHub Web Interface

1. Go to https://github.com/new
2. Create a new repository named `ncc-monitor`
3. Don't initialize with README, .gitignore, or license
4. Run these commands in your project directory:

```bash
git init
git add .
git commit -m "Initial commit - NCC Monitor application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ncc-monitor.git
git push -u origin main
```

## Step 2: Deploy to Railway

### 2.1 Create New Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account if prompted
5. Select the `ncc-monitor` repository

### 2.2 Configure Environment Variables

After the project is created, click on your service and go to the **Variables** tab. Add these environment variables:

**Required Variables:**

```
NODE_ENV=production
JWT_SECRET=your_secure_random_string_here_min_32_chars
PORT=3000
```

**Optional Variables (if using database):**

```
DATABASE_URL=mysql://user:password@host:port/database
```

**To generate a secure JWT_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use any random string generator (minimum 32 characters)
```

### 2.3 Configure Port

Railway automatically detects the PORT environment variable. The application is configured to listen on port 3000, which Railway will expose publicly.

### 2.4 Deploy

1. Railway will automatically start building and deploying your application
2. Wait for the build to complete (usually 2-5 minutes)
3. Once deployed, Railway will provide a public URL like: `https://your-app-name.up.railway.app`

## Step 3: Add Database (Optional)

If you need a MySQL database:

1. In your Railway project, click **"New"** → **"Database"** → **"Add MySQL"**
2. Railway will automatically create a `DATABASE_URL` variable
3. Your application will automatically connect to it

## Step 4: Custom Domain (Optional)

1. Go to your service settings
2. Click on **"Settings"** → **"Domains"**
3. Click **"Generate Domain"** for a free Railway subdomain
4. Or click **"Custom Domain"** to add your own domain

## Step 5: Verify Deployment

1. Visit your Railway URL
2. You should see the NCC Monitor login page
3. Test login with:
   - Email: `demo@user.com`
   - Password: `password123`

## Troubleshooting

### Build Fails

- Check the build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify `pnpm-lock.yaml` is committed to git

### Application Crashes

- Check the deployment logs
- Verify `JWT_SECRET` is set in environment variables
- Ensure `NODE_ENV=production` is set

### Static Files Not Loading

- Verify the build command includes: `npx expo export --platform web`
- Check that the `dist` directory is being created during build

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | `your_32_char_secret` |
| `PORT` | No | Server port (auto-set by Railway) | `3000` |
| `DATABASE_URL` | No | MySQL connection string | `mysql://user:pass@host/db` |
| `OAUTH_SERVER_URL` | No | OAuth server URL | `https://oauth.example.com` |

## Continuous Deployment

Railway automatically redeploys your application when you push changes to GitHub:

```bash
# Make your changes
git add .
git commit -m "Update feature"
git push origin main
```

Railway will detect the push and automatically rebuild and redeploy.

## Cost Estimation

Railway offers:
- **Free Tier**: $5 of usage credits per month
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage

Your application should fit comfortably within the free tier for testing and small-scale use.

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: Create issues in your repository

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Test the application
3. ⬜ Set up a custom domain
4. ⬜ Configure a production database
5. ⬜ Set up monitoring and alerts
6. ⬜ Enable automatic backups

---

**Your NCC Monitor application is now live on Railway! 🚀**
