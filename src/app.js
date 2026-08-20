require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const parentRoutes = require('./routes/parentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const quizRoutes = require('./routes/quizRoutes');
const bookRoutes = require('./routes/bookRoutes');
const diaryRoutes = require('./routes/diaryRoutes');
const errorHandler = require('./middleware/errorHandler');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

const app = express();

// Security Headers via Helmet (HSTS enabled, X-Powered-By disabled)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled CSP so Swagger UI assets load cleanly
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  hidePoweredBy: true
}));

// Universal Multi-Platform CORS Setup (Supports Web, Android, iOS, Mac, Flutter, Emulators, Postman)
app.use(cors({
  origin: (origin, callback) => {
    // Native mobile apps (Android/iOS/Flutter/Mac) & local tools don't send an Origin header
    if (!origin) return callback(null, true);

    const configured = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
    if (configured.includes('*') || configured.includes(origin)) {
      return callback(null, true);
    }
    // Allow cross-platform mobile apps, local web dev, and custom origin schemes
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Body Parsers & Cookie Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie_signing_secret_ai_tuition'));

// Interactive Swagger API Documentation Endpoint
app.use(['/api-docs', '/aituition/api-docs'], swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/auth', authRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/parents', parentRoutes);
app.use('/api/v1', parentRoutes);
app.use('/', parentRoutes);
app.use('/api/v1', teacherRoutes);
app.use('/', teacherRoutes);
app.use('/api/v1', studentRoutes);
app.use('/', studentRoutes);
app.use('/api/v1', quizRoutes);
app.use('/', quizRoutes);
app.use('/api/v1', bookRoutes);
app.use('/', bookRoutes);
app.use('/api/v1', diaryRoutes);
app.use('/', diaryRoutes);

// Catch-all 404 Route
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `The requested endpoint '${req.originalUrl}' does not exist on this server.`,
      details: []
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
