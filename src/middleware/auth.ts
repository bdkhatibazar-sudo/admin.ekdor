import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = {
      uid: 'demo-user',
      email: 'demo@ekdor.shop',
      name: 'দোকানদার',
    };
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  req.user = {
    uid: token || 'demo-user',
    email: 'user@ekdor.shop',
    name: 'দোকানদার',
  };
  next();
};
