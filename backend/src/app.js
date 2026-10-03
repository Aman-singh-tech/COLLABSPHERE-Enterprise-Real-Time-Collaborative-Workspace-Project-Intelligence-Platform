const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const env = require('./config/env');
const routes = require('./routes');
const auditContext = require('./middlewares/audit.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { errorMiddleware, notFoundMiddleware } = require('./middlewares/error.middleware');

const app = express();

// Security middleware
app.set('trust proxy', 1); // Trust first proxy (Render load balancer)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - allow frontend origin with credentials (cookies)
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === env.CLIENT_URL ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Passport (stateless, JWT-based; used only for Google OAuth strategy)
app.use(passport.initialize());

// Audit trail helper (req.audit(...))
app.use(auditContext);

// Static file serving for uploaded assets
app.use('/uploads', express.static('uploads'));

// Rate limiting (applied to all API routes)
app.use('/api', apiLimiter);

// Root health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'CollabSphere API Backend Server is live and running successfully!',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/v1', routes);

// 404 + error handling

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
