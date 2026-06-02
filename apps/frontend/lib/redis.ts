import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function kv_get<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key)
  } catch (e) {
    console.error('redis get error:', key, e)
    return null
  }
}

export async function kv_set(key: string, value: unknown, exSeconds?: number): Promise<void> {
  try {
    if (exSeconds) {
      await redis.set(key, value, { ex: exSeconds })
    } else {
      await redis.set(key, value)
    }
  } catch (e) {
    console.error('redis set error:', key, e)
  }
}
