import dotenv from 'dotenv';

dotenv.config({ override: true });

const requiredVariables = ['MONGO_URI', 'JWT_SECRET'];
const nodeEnv = process.env.NODE_ENV || 'development';

export function validateEnv() {
  const missing = requiredVariables.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  waafi: {
    baseUrl: process.env.WAAFI_API_URL || process.env.WAAFI_BASE_URL || 'https://api.waafipay.net/asm',
    merchantUid: process.env.WAAFI_MERCHANT_UID || '',
    apiUserId: process.env.WAAFI_API_USER_ID || '',
    apiKey: process.env.WAAFI_API_KEY || '',
    channelName: process.env.WAAFI_CHANNEL_NAME || 'WEB',
    serviceName: process.env.WAAFI_SERVICE_NAME || 'API_PURCHASE',
    currency: process.env.WAAFI_CURRENCY || 'USD',
  },
};
