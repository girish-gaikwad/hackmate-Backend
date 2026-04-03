# College Hackathon Companion - Backend API

A comprehensive REST API for the College Hackathon Companion application, helping college students discover hackathons, find teammates, form teams, and access resources.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Environment Variables](#environment-variables)
- [Database Models](#database-models)
- [WebSocket Events](#websocket-events)
- [Scheduled Jobs](#scheduled-jobs)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Features

- **User Management**: Registration, authentication, profile management with college email verification
- **Hackathon Discovery**: Browse, search, and filter hackathons from Devpost, MLH, and manual entries
- **Teammate Finding**: Post and respond to teammate requests with interest system
- **Team Formation**: Create teams, invite members, manage join requests
- **Resource Sharing**: Share and discover tutorials, tools, templates, and articles
- **Bookmarking**: Save hackathons and resources with reminder notifications
- **Real-time Messaging**: Direct and team messaging with Socket.io
- **Notifications**: In-app and email notifications for important events
- **Admin Dashboard**: User management, content moderation, analytics

## Tech Stack

- **Runtime**: Node.js v18+/v20 LTS
- **Framework**: Express.js v4.x
- **Database**: MongoDB Atlas with Mongoose ODM
- **Authentication**: JWT (Access + Refresh Tokens)
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Real-time**: Socket.io
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Task Scheduling**: node-cron

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   └── cloudinary.js # Cloudinary setup
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Express middleware
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── validations/      # Joi validation schemas
│   ├── socket/           # Socket.io handlers
│   ├── cron/             # Scheduled jobs
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── tests/                # Test files
├── uploads/              # Local uploads (dev only)
├── logs/                 # Application logs
├── .env.example          # Environment variables template
├── package.json
├── jest.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+ or v20 LTS
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account
- SMTP service (e.g., Mailgun, SendGrid)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration

5. Start the development server:
```bash
npm run dev
```

The server will start at `http://localhost:5000`

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with hot reload
npm test           # Run tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint       # Run ESLint
```

### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://your-domain.com/api/v1
```

### Endpoints Overview

| Resource | Endpoints |
|----------|-----------|
| Auth | `/auth` - Registration, login, password reset |
| Users | `/users` - Profile management |
| Hackathons | `/hackathons` - Hackathon discovery |
| Teammate Requests | `/teammate-requests` - Find teammates |
| Teams | `/teams` - Team management |
| Resources | `/resources` - Learning resources |
| Bookmarks | `/bookmarks` - Save items |
| Messages | `/messages` - Direct & team messaging |
| Notifications | `/notifications` - User notifications |
| Search | `/search` - Global search |
| Admin | `/admin` - Admin operations |

## Authentication

The API uses JWT-based authentication with access and refresh tokens.

### Headers
```
Authorization: Bearer <access_token>
```

### Token Refresh
```
POST /api/v1/auth/refresh-token
Body: { "refreshToken": "<refresh_token>" }
```

### Protected Routes

Most routes require authentication. Public routes include:
- `POST /auth/register`
- `POST /auth/login`
- `GET /hackathons` (public listing)
- `GET /resources` (public listing)
- `GET /search`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | No (default: 5000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes |
| `JWT_EXPIRE` | Access token expiry | No (default: 15m) |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | No (default: 7d) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `SMTP_HOST` | SMTP server host | Yes |
| `SMTP_PORT` | SMTP server port | Yes |
| `SMTP_USER` | SMTP username | Yes |
| `SMTP_PASS` | SMTP password | Yes |
| `FROM_EMAIL` | Sender email address | Yes |
| `FRONTEND_URL` | Frontend application URL | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | No |

## Database Models

### User
- Profile information (name, email, college, skills)
- Authentication data (password, tokens)
- Settings (notifications, privacy)

### Hackathon
- Event details (name, dates, location)
- Registration information
- Themes and prizes

### TeammateRequest
- User seeking teammates
- Required skills
- Interest expressions

### Team
- Team members and roles
- Associated hackathon
- Invitations and join requests

### Resource
- Educational content
- Voting and comments
- Categories and tags

### Message
- Direct and team messages
- Attachments
- Read status

### Notification
- Various notification types
- Read status
- Related entities

### Bookmark
- Saved hackathons and resources
- Reminder settings

## WebSocket Events

### Client → Server

| Event | Description |
|-------|-------------|
| `message:send` | Send direct message |
| `message:read` | Mark message as read |
| `team:join` | Join team room |
| `team:leave` | Leave team room |
| `team:message:send` | Send team message |
| `typing:start` | Start typing indicator |
| `typing:stop` | Stop typing indicator |

### Server → Client

| Event | Description |
|-------|-------------|
| `message:receive` | New message received |
| `message:read:ack` | Message read acknowledgment |
| `team:message:receive` | New team message |
| `typing:indicator` | User typing status |
| `notification:new` | New notification |
| `user:online` | User came online |
| `user:offline` | User went offline |

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Hackathon Sync | Daily 2:00 AM | Sync from Devpost/MLH |
| Reminders | Daily 9:00 AM | Send deadline reminders |
| Cleanup Hackathons | Daily 3:00 AM | Deactivate old hackathons |
| Cleanup Notifications | Weekly Sunday 4:00 AM | Remove old read notifications |
| Update User Stats | Hourly | Update online status |
| Cleanup Requests | Daily 1:00 AM | Close expired requests |
| Daily Analytics | Daily 11:55 PM | Generate analytics snapshot |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/controllers/auth.test.js

# Run in watch mode
npm run test:watch
```

### Test Coverage Requirements
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Enable HTTPS
5. Set up monitoring and logging
6. Configure rate limiting
7. Set up database backups
8. Configure CDN for static assets

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
```

### Health Check

```
GET /api/v1/health
```

Returns server status and timestamp.

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [],
  "stack": "..." // Only in development
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- File uploads: 10 requests per hour

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details
