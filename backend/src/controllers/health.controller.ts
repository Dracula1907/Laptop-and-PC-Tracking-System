import { Request, Response } from 'express';
import prisma from '../config/prisma';

export class HealthController {
  static async checkHealth(req: Request, res: Response) {
    let dbStatus = 'OFFLINE';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'HEALTHY';
    } catch (err) {
      dbStatus = 'DEGRADED';
    }

    const health = {
      success: true,
      api: 'HEALTHY',
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      version: 'v1.0.0',
      timestamp: new Date().toISOString(),
    };

    const statusCode = dbStatus === 'HEALTHY' ? 200 : 503;
    return res.status(statusCode).json(health);
  }
}
