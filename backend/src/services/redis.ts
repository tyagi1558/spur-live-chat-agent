import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnectionAttempted = false;

export async function initRedis() {
  // Only attempt connection once
  if (redisConnectionAttempted) {
    return redisClient;
  }
  
  redisConnectionAttempted = true;
  
  // Skip Redis if explicitly disabled
  if (process.env.REDIS_ENABLED === 'false') {
    console.log('⚠ Redis disabled (REDIS_ENABLED=false), continuing without cache');
    return null;
  }

  try {
    // Use 127.0.0.1 explicitly to avoid IPv6 issues on Windows
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    
    redisClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        family: 4, // Force IPv4 to avoid ::1 connection issues on Windows
        reconnectStrategy: false, // Don't auto-reconnect, fail once and continue
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    // Suppress error logging after first attempt
    redisClient.on('error', () => {
      // Silent - we already logged the initial error
    });
    
    await redisClient.connect();
    console.log('✓ Redis connected');
    return redisClient;
  } catch (error) {
    console.warn('⚠ Redis connection failed, continuing without cache (app will work fine)');
    redisClient = null;
    return null;
  }
}

export function getRedisClient() {
  return redisClient;
}

export async function getCached(key: string): Promise<string | null> {
  if (!redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCached(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, value);
  } catch (error) {
    console.error('Redis set error:', error);
  }
}


