import { Redis } from "@upstash/redis";

// Single shared client — every API route in this app uses the same Upstash instance.
let _redis: Redis | null = null;
export function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

// Redis keys for the Team Hub at /team.
// Shared across admin (/) and coach (/coach) dashboards — anything written
// here can be surfaced on the others.
export const TEAM_KEYS = {
  content: "team:content",
  podcast: "team:podcast",
  meeting: "team:meeting:current",
  goals: "team:goals",
  events: "team:events",
} as const;

export function parseJsonArray<T = unknown>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    try { return JSON.parse(JSON.stringify(raw)) as T[]; } catch { return raw as T[]; }
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return JSON.parse(parsed) as T[];
      return parsed as T[];
    } catch { return []; }
  }
  return [];
}

export function parseJsonObject<T = unknown>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return JSON.parse(parsed) as T;
      return parsed as T;
    } catch { return null; }
  }
  return null;
}
