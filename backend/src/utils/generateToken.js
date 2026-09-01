import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';


// ============================================================
// JWT TOKEN GENERATION
// ============================================================

// Function-kan wuxuu sameeyaa JWT token.
// Token-ka waxaa lagu siinayaa user-ka marka uu register/login sameeyo.
export function generateToken(userId) {

  return jwt.sign(

    // Xogta token-ka ku jirta
    // Halkan user ID ayaa lagu kaydinayaa.
    {
      id: userId.toString(),
    },

    // Secret key-ga JWT
    // Waxaa laga helayaa environment variables.
    env.jwtSecret,

    // Mudada token-ku shaqeynayo
    // Tusaale: 7d, 30d, iwm.
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
}