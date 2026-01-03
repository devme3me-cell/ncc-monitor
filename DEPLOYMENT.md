# NCC Monitor - Deployment Guide

This guide provides instructions for deploying the NCC Monitor application to production.

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Prerequisites
- Docker and Docker Compose installed on your server
- A MySQL/TiDB database (or use SQLite for testing)
- Domain name (optional, but recommended)

#### Steps

1. **Clone or upload the project to your server**
   ```bash
   # Upload the project files to your server
   scp -r /path/to/ncc-monitor user@your-server:/opt/
   ```

2. **Configure environment variables**
   ```bash
   cd /opt/ncc-monitor
   cp .env.production.example .env.production
   nano .env.production
   ```
   
   Update the following variables:
   - `DATABASE_URL`: Your database connection string
   - `JWT_SECRET`: Generate a secure random string
   - `OAUTH_SERVER_URL`: (Optional) OAuth server URL if needed

3. **Build and start the application**
   ```bash
   docker-compose up -d --build
   ```

4. **Verify the deployment**
   ```bash
   docker-compose logs -f
   ```
   
   The application should be accessible at:
   - Web frontend: http://your-server:8081
   - API backend: http://your-server:3000

5. **Set up reverse proxy (recommended)**
   
   Use Nginx or Caddy to:
   - Enable HTTPS with SSL certificates
   - Route traffic to the appropriate ports
   - Add custom domain support

   Example Nginx configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:8081;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
       
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Platform-as-a-Service (PaaS) Deployment

#### Render.com

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `pnpm install && pnpm build && npx expo export --platform web`
   - Start Command: `node dist/index.js`
4. Add environment variables in Render dashboard
5. Deploy

#### Railway.app

1. Create a new project on Railway
2. Connect your GitHub repository
3. Add environment variables
4. Railway will auto-detect and deploy your Node.js app

#### Heroku

1. Create a new Heroku app
2. Add a Procfile:
   ```
   web: node dist/index.js
   ```
3. Push to Heroku:
   ```bash
   git push heroku main
   ```

### Option 3: VPS Deployment (Manual)

#### Prerequisites
- Ubuntu/Debian server with Node.js 22+ installed
- PM2 for process management
- Nginx for reverse proxy

#### Steps

1. **Install dependencies**
   ```bash
   sudo apt update
   sudo apt install nodejs npm nginx
   npm install -g pnpm pm2
   ```

2. **Upload and setup project**
   ```bash
   cd /opt
   git clone <your-repo> ncc-monitor
   cd ncc-monitor
   pnpm install
   pnpm build
   npx expo export --platform web
   ```

3. **Configure environment**
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```

4. **Start with PM2**
   ```bash
   pm2 start dist/index.js --name ncc-monitor
   pm2 startup
   pm2 save
   ```

5. **Configure Nginx** (see example above)

6. **Enable SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Database Setup

### Using TiDB Cloud (Recommended)
1. Create a free TiDB Serverless cluster at https://tidbcloud.com
2. Copy the connection string
3. Update `DATABASE_URL` in your environment variables

### Using MySQL
1. Install MySQL on your server
2. Create a database: `CREATE DATABASE ncc_monitor;`
3. Update `DATABASE_URL` with your MySQL credentials

### Using SQLite (Development/Testing Only)
1. Update `DATABASE_URL` to: `file:./data/app.db`
2. Ensure the `./data` directory exists

## Post-Deployment

1. **Run database migrations**
   ```bash
   pnpm db:push
   ```

2. **Test the application**
   - Access the web interface
   - Create a test account
   - Add a test NCC serial number
   - Verify monitoring functionality

3. **Set up monitoring**
   - Use PM2 monitoring: `pm2 monit`
   - Set up log aggregation
   - Configure uptime monitoring (e.g., UptimeRobot)

4. **Configure backups**
   - Set up automated database backups
   - Back up environment variables securely

## Troubleshooting

### Application won't start
- Check logs: `docker-compose logs` or `pm2 logs`
- Verify environment variables are set correctly
- Ensure database is accessible

### Database connection errors
- Verify `DATABASE_URL` format
- Check firewall rules
- Test database connectivity: `mysql -h host -u user -p`

### Web interface not loading
- Check if port 8081 is accessible
- Verify Nginx/reverse proxy configuration
- Check browser console for errors

## Security Recommendations

1. **Use HTTPS** - Always use SSL/TLS in production
2. **Secure JWT_SECRET** - Generate a strong random secret
3. **Database security** - Use strong passwords, restrict access
4. **Firewall** - Only expose necessary ports (80, 443)
5. **Regular updates** - Keep dependencies and system packages updated
6. **Environment variables** - Never commit `.env` files to version control

## Maintenance

### Update the application
```bash
git pull
pnpm install
pnpm build
npx expo export --platform web
pm2 restart ncc-monitor
# or with Docker:
docker-compose down
docker-compose up -d --build
```

### View logs
```bash
pm2 logs ncc-monitor
# or with Docker:
docker-compose logs -f
```

### Backup database
```bash
mysqldump -u user -p ncc_monitor > backup_$(date +%Y%m%d).sql
```

## Support

For issues or questions, please refer to:
- Project documentation in `/docs`
- Design document: `design.md`
- TODO list: `todo.md`
