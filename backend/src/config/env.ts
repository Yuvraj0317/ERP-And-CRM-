import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://erp_user:erp_password@localhost:5432/mini_operations_erp?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-mini-erp-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
