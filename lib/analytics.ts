import { Redis } from "@upstash/redis";

const kv = Redis.fromEnv();

const TOTAL_KEY = "analytics:pageviews:total";

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Records one guest-list pageview. Called once per page load from GuestApp,
 * not on every 6s poll, so counts reflect visits rather than API traffic.
 */
export async function trackPageview(): Promise<void> {
  const today = dayKey(new Date());
  const pipeline = kv.pipeline();
  pipeline.incr(TOTAL_KEY);
  pipeline.incr(`analytics:pageviews:day:${today}`);
  await pipeline.exec();
}

export interface DailyPageviews {
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  totalPageviews: number;
  last7Days: DailyPageviews[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const total = (await kv.get<number>(TOTAL_KEY)) || 0;

  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(dayKey(d));
  }

  const counts = await Promise.all(days.map((day) => kv.get<number>(`analytics:pageviews:day:${day}`)));

  return {
    totalPageviews: total,
    last7Days: days.map((date, index) => ({ date, count: counts[index] || 0 }))
  };
}
