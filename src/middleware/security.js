const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General rate limiter
const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for admin endpoints
const adminLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests per window
  'Too many admin requests from this IP, please try again later.'
);

// Very strict rate limiter for data collection endpoints
const dataCollectionLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5, // 5 requests per hour
  'Data collection requests are limited. Please try again later.'
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, you should specify allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'];
    
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts from query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    }
  }
  
  // Remove any potential XSS attempts from request body
  if (req.body) {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }
  
  next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check for common attack patterns
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection
    /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i, // XSS
    /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)/i // IMG XSS
  ];
  
  const checkString = (str) => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };
  
  // Check URL
  if (checkString(req.url)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request',
      message: 'Request contains suspicious patterns'
    });
  }
  
  // Check query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string' && checkString(req.query[key])) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Query parameters contain suspicious patterns'
        });
      }
    }
  }
  
  next();
};

// IP whitelist middleware (for admin endpoints in production)
const ipWhitelist = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  const allowedIPs = process.env.ADMIN_ALLOWED_IPS 
    ? process.env.ADMIN_ALLOWED_IPS.split(',')
    : [];
  
  if (allowedIPs.length === 0) {
    return next(); // No IP restriction if not configured
  }
  
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address is not authorized to access this endpoint'
    });
  }
  
  next();
};

module.exports = {
  generalLimiter,
  adminLimiter,
  dataCollectionLimiter,
  corsOptions,
  helmetConfig,
  sanitizeInput,
  validateRequest,
  ipWhitelist
};
