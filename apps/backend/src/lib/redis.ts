// Redis client stub — full implementation added in Step 05 (reminders/sessions)
// Using ioredis when REDIS_URL is configured.

let redisClient: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, mode?: string, duration?: number) => Promise<unknown>; del: (key: string) => Promise<number> } | null = null

export function getRedisClient() {
  return redisClient
}

export async function connectRedis(url: string): Promise<void> {
  // Will wire up ioredis in Step 05
  console.warn(`Redis connection stub — skipping connection to ${url}`)
}
