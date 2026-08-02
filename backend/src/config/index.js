  import dotenv from 'dotenv';
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Load .env from backend root directory
  dotenv.config({ path: path.join(__dirname, '../../.env') });

  /**
   * Validate required environment variables at application startup.
   * Throws an explicit error if critical environment tokens are invalid or missing.
   */
  const validateEnv = () => {
    const required = ['PORT', 'NODE_ENV', 'MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
    const missing = required.filter(key => !process.env[key] && !getDefault(key));

    if (missing.length > 0) {
      throw new Error(`[Configuration Error] Missing critical environment variables: ${missing.join(', ')}`);
    }

    const port = parseInt(process.env.PORT || '5000', 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      throw new Error(`[Configuration Error] Invalid PORT specified: ${process.env.PORT}`);
    }

    const validEnvs = ['development', 'production', 'test'];
    const env = process.env.NODE_ENV || 'development';
    if (!validEnvs.includes(env)) {
      throw new Error(`[Configuration Error] Invalid NODE_ENV: ${env}. Must be one of: ${validEnvs.join(', ')}`);
    }
  };

  const getDefault = (key) => {
    const defaults = {
      PORT: '5000',
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb://localhost:27017/studyflow-ai',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d'
    };
    return defaults[key];
  };

  // Execute boot validation
  validateEnv();

  export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow-ai',
    corsOrigin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
      : '*',
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || getDefault('JWT_ACCESS_SECRET'),
      refreshSecret: process.env.JWT_REFRESH_SECRET || getDefault('JWT_REFRESH_SECRET'),
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || getDefault('JWT_ACCESS_EXPIRES_IN'),
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || getDefault('JWT_REFRESH_EXPIRES_IN')
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins default
      max: parseInt(process.env.RATE_LIMIT_MAX || ((process.env.NODE_ENV || 'development') === 'development' ? '3000' : '100'), 10)
    }
  };
