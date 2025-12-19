import { Router } from 'express';
import { pool } from '../db/connection';
import { getRedisClient } from '../services/redis';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    // Check database
    await pool.query('SELECT 1');
    const dbStatus = 'healthy';

    // Check Redis
    const redis = getRedisClient();
    let redisStatus = 'not_configured';
    if (redis) {
      try {
        await redis.ping();
        redisStatus = 'healthy';
      } catch {
        redisStatus = 'unhealthy';
      }
    }

    res.json({
      status: 'ok',
      database: dbStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


