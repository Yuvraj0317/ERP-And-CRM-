import jwt, { SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
}

export const signToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: ENV.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, ENV.JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
};
