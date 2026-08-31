import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRoutes from './routes/index.js';
import { LISTING_UPLOAD_DIR } from './utils/listingImageStorage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function stripMongoOperators(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripMongoOperators);
  const clean = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key.startsWith('$')) continue;
    clean[key] = stripMongoOperators(nested);
  }
  return clean;
}

const app = express();

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [env.frontendUrl, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(null, env.nodeEnv !== 'production');
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') req.body = stripMongoOperators(req.body);
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

app.use('/uploads/listings', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(LISTING_UPLOAD_DIR, {
  maxAge: env.nodeEnv === 'production' ? '7d' : 0,
  fallthrough: true,
}));

app.use('/api/v1', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
