const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const logger = require('./utils/logger');

// Initialize express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173', '*']; // Allow all origins if CORS_ORIGIN is not set
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Total-Pages']
};

app.use(cors(corsOptions));

// Body parser middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Compression middleware
app.use(compression());

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate limiting
app.use('/api/', apiLimiter);

// Swagger documentation setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'College Hackathon Companion API',
      version: '1.0.0',
      description: 'REST API for College Hackathon Companion application - helping college students discover hackathons, find teammates, form teams, and access resources.',
      contact: {
        name: 'API Support',
        email: 'support@hackathoncompanion.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            stack: { type: 'string', example: 'Error stack trace (only in development)' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            currentPage: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 10 },
            totalItems: { type: 'integer', example: 100 },
            itemsPerPage: { type: 'integer', example: 10 }
          }
        },
        // Auth Schemas
        RegisterInput: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john.doe@university.edu' },
            password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            collegeName: { type: 'string', example: 'MIT' },
            graduationYear: { type: 'integer', example: 2026 },
            skills: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['JavaScript', 'React', 'Node.js']
            }
          }
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john.doe@university.edu' },
            password: { type: 'string', example: 'SecurePass123!' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
              }
            }
          }
        },
        // User Schema
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', example: 'john.doe@university.edu' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            profilePicture: { type: 'string', example: 'https://res.cloudinary.com/...' },
            bio: { type: 'string', example: 'Full-stack developer passionate about hackathons' },
            collegeName: { type: 'string', example: 'MIT' },
            graduationYear: { type: 'integer', example: 2026 },
            skills: { type: 'array', items: { type: 'string' }, example: ['JavaScript', 'React', 'Node.js'] },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            isVerified: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        UpdateProfileInput: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            bio: { type: 'string', example: 'Full-stack developer passionate about hackathons' },
            collegeName: { type: 'string', example: 'MIT' },
            graduationYear: { type: 'integer', example: 2026 },
            skills: { type: 'array', items: { type: 'string' }, example: ['JavaScript', 'React', 'Node.js'] },
            socialLinks: {
              type: 'object',
              properties: {
                github: { type: 'string', example: 'https://github.com/johndoe' },
                linkedin: { type: 'string', example: 'https://linkedin.com/in/johndoe' },
                twitter: { type: 'string', example: 'https://twitter.com/johndoe' },
                portfolio: { type: 'string', example: 'https://johndoe.dev' }
              }
            }
          }
        },
        // Hackathon Schema
        Hackathon: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            title: { type: 'string', example: 'HackMIT 2026' },
            description: { type: 'string', example: 'Annual hackathon at MIT' },
            organizer: { type: 'string', example: 'MIT' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            registrationDeadline: { type: 'string', format: 'date-time' },
            location: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['in-person', 'virtual', 'hybrid'], example: 'hybrid' },
                venue: { type: 'string', example: 'MIT Campus' },
                city: { type: 'string', example: 'Cambridge' },
                state: { type: 'string', example: 'MA' },
                country: { type: 'string', example: 'USA' }
              }
            },
            prizes: { type: 'array', items: { type: 'string' }, example: ['$10,000 Grand Prize', '$5,000 Runner-up'] },
            themes: { type: 'array', items: { type: 'string' }, example: ['AI/ML', 'Web3', 'Healthcare'] },
            teamSize: {
              type: 'object',
              properties: {
                min: { type: 'integer', example: 2 },
                max: { type: 'integer', example: 4 }
              }
            },
            registrationUrl: { type: 'string', example: 'https://hackmit.org/register' },
            websiteUrl: { type: 'string', example: 'https://hackmit.org' },
            isFeatured: { type: 'boolean', example: true }
          }
        },
        // Teammate Request Schema
        TeammateRequestInput: {
          type: 'object',
          required: ['hackathon', 'title', 'description', 'skillsNeeded'],
          properties: {
            hackathon: { type: 'string', example: '507f1f77bcf86cd799439012' },
            title: { type: 'string', example: 'Looking for React developers for HackMIT' },
            description: { type: 'string', example: 'We are building an AI-powered study assistant and need frontend developers' },
            skillsNeeded: { type: 'array', items: { type: 'string' }, example: ['React', 'TypeScript', 'Tailwind CSS'] },
            teamSize: { type: 'integer', example: 2 },
            currentTeamSize: { type: 'integer', example: 2 },
            communicationPreference: { type: 'string', enum: ['discord', 'slack', 'email', 'other'], example: 'discord' }
          }
        },
        // Team Schema
        TeamInput: {
          type: 'object',
          required: ['name', 'hackathon'],
          properties: {
            name: { type: 'string', example: 'Code Crusaders' },
            hackathon: { type: 'string', example: '507f1f77bcf86cd799439012' },
            description: { type: 'string', example: 'A passionate team of developers building innovative solutions' },
            isOpen: { type: 'boolean', example: true },
            maxMembers: { type: 'integer', example: 4 }
          }
        },
        // Resource Schema
        ResourceInput: {
          type: 'object',
          required: ['title', 'type', 'url', 'category'],
          properties: {
            title: { type: 'string', example: 'React Documentation' },
            description: { type: 'string', example: 'Official React documentation for learning React' },
            type: { type: 'string', enum: ['article', 'video', 'tutorial', 'tool', 'template', 'other'], example: 'tutorial' },
            url: { type: 'string', example: 'https://react.dev' },
            category: { type: 'string', enum: ['frontend', 'backend', 'mobile', 'devops', 'design', 'ml-ai', 'blockchain', 'other'], example: 'frontend' },
            tags: { type: 'array', items: { type: 'string' }, example: ['react', 'javascript', 'frontend'] },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], example: 'beginner' }
          }
        },
        // Message Schema
        MessageInput: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', example: 'Hey, are you available for the hackathon this weekend?' },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  type: { type: 'string' }
                }
              }
            }
          }
        },
        // Bookmark Schema
        BookmarkInput: {
          type: 'object',
          required: ['itemType', 'itemId'],
          properties: {
            itemType: { type: 'string', enum: ['hackathon', 'resource', 'teammate-request'], example: 'hackathon' },
            itemId: { type: 'string', example: '507f1f77bcf86cd799439012' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Hackathons', description: 'Hackathon discovery and management' },
      { name: 'Teammate Requests', description: 'Find teammates for hackathons' },
      { name: 'Teams', description: 'Team formation and management' },
      { name: 'Resources', description: 'Learning resources and tools' },
      { name: 'Bookmarks', description: 'Bookmark management' },
      { name: 'Messages', description: 'Direct and team messaging' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Admin', description: 'Admin management endpoints' },
      { name: 'Search', description: 'Global search functionality' }
    ]
  },
  apis: [
    path.join(__dirname, './routes/*.js'),
    path.join(__dirname, './models/*.js')
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hackathon Companion API Docs'
}));

// Serve Swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Static files for uploads (if storing locally in development)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to College Hackathon Companion API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/api/v1/health'
  });
});

// Handle 404 - Route not found
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
