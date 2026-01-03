# NCC Monitor (NCC 序號監控)

A comprehensive monitoring system for NCC (National Communications Commission) certification serial numbers with integrated Shopee marketplace tracking.

## Features

- 📊 **Serial Number Monitoring**: Track and manage NCC certification serial numbers
- 🛍️ **Shopee Integration**: Monitor product listings on Shopee marketplace
- 🔍 **Detection System**: Automated scanning and detection of serial number usage
- 👤 **User Authentication**: Secure login system with test account support
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🎨 **Modern UI**: Clean, intuitive interface with dark/light mode support

## Tech Stack

- **Frontend**: React Native (Expo) + TypeScript
- **Backend**: Node.js + Express
- **Database**: MySQL / TiDB (optional)
- **Authentication**: JWT-based sessions
- **Styling**: TailwindCSS + NativeWind

## Quick Start

### Prerequisites

- Node.js 22.x or higher
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ncc-monitor.git
cd ncc-monitor

# Install dependencies
pnpm install

# Set up environment variables
cp .env.production.example .env
# Edit .env and add your configuration

# Build the backend
pnpm build

# Export the web frontend
npx expo export --platform web

# Start the production server
NODE_ENV=production JWT_SECRET=your_secret node dist/index.js
```

### Development Mode

```bash
# Start both frontend and backend in development mode
pnpm dev
```

This will start:
- Backend API server on port 3000
- Frontend dev server on port 8081

## Test Account

For testing purposes, you can use:
- **Email**: `demo@user.com`
- **Password**: `password123`

## Deployment

### Railway.app (Recommended)

See [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) for detailed instructions.

Quick steps:
1. Push code to GitHub
2. Connect repository to Railway
3. Set environment variables
4. Deploy automatically

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment options including:
- Render.com
- VPS with Docker
- Cloud platforms (AWS, GCP, Azure)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` for production |
| `JWT_SECRET` | Yes | Secret key for JWT tokens (min 32 chars) |
| `PORT` | No | Server port (default: 3000) |
| `DATABASE_URL` | No | MySQL connection string |
| `OAUTH_SERVER_URL` | No | OAuth server URL for external auth |

## Project Structure

```
ncc-monitor/
├── app/                    # Expo Router pages
├── components/             # React components
├── constants/              # App constants and config
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
├── server/                 # Backend API server
│   ├── _core/             # Core server logic
│   ├── local-auth.ts      # Local authentication
│   └── google-auth.ts     # Google OAuth
├── shared/                 # Shared types and utilities
├── dist/                   # Built frontend (web export)
├── drizzle/               # Database schema
└── tests/                 # Test files
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/me` - Get current user info

### OAuth
- `GET /api/oauth/callback` - OAuth callback handler
- `GET /api/oauth/mobile` - Mobile OAuth token exchange

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in this repository
- Check the deployment guides in the `docs/` folder

## Acknowledgments

Built with:
- [Expo](https://expo.dev)
- [React Native](https://reactnative.dev)
- [Railway](https://railway.app)
- [TailwindCSS](https://tailwindcss.com)

---

**Made with ❤️ for NCC certification monitoring**
