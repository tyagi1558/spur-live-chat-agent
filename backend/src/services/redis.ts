import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnectionAttempted = false;

function isCloudRuntime(): boolean {
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_SERVICE_NAME ||
    process.env.RENDER ||
    process.env.FLY_APP_NAME
  );
}

function isLocalRedisHost(host: string): boolean {
  const h = host.toLowerCase().trim();
  return h === "localhost" || h === "127.0.0.1" || h === "";
}

/** Skip Redis when misconfigured for cloud (localhost has no Redis on Railway/Render). */
function shouldSkipRedis(): boolean {
  if (process.env.REDIS_ENABLED === "false") {
    return true;
  }

  if (process.env.REDIS_URL?.trim()) {
    return false;
  }

  const host = process.env.REDIS_HOST || "127.0.0.1";
  if (isCloudRuntime() && isLocalRedisHost(host)) {
    return true;
  }

  return false;
}

export async function initRedis() {
  if (redisConnectionAttempted) {
    return redisClient;
  }

  redisConnectionAttempted = true;

  if (shouldSkipRedis()) {
    if (isCloudRuntime() && isLocalRedisHost(process.env.REDIS_HOST || "")) {
      console.log(
        "⚠ Redis skipped: REDIS_HOST is localhost but app runs on cloud. Set REDIS_URL (Upstash/Railway Redis) or REDIS_ENABLED=false"
      );
    } else {
      console.log("⚠ Redis disabled, continuing without cache");
    }
    return null;
  }

  try {
    const redisUrl = process.env.REDIS_URL?.trim();

    if (redisUrl) {
      redisClient = createClient({ url: redisUrl });
    } else {
      const redisHost = process.env.REDIS_HOST || "127.0.0.1";
      const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

      redisClient = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          family: 4,
          reconnectStrategy: false,
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });
    }

    redisClient.on("error", () => {});

    await redisClient.connect();
    console.log("✓ Redis connected");
    return redisClient;
  } catch (error) {
    console.warn(
      "⚠ Redis connection failed, continuing without cache (app will work fine)"
    );
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
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setCached(
  key: string,
  value: string,
  ttlSeconds: number = 3600
): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, value);
  } catch (error) {
    console.error("Redis set error:", error);
  }
}
