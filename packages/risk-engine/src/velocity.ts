import Redis from 'ioredis';
import { randomUUID } from 'crypto';

// Note: Ensure REDIS_URL is set in the environment
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:8079');

export async function checkVelocity(ip: string, merchantId: string, amount: number): Promise<{ score: number; signals: Record<string, any> }> {
  let score = 0;
  const signals: Record<string, any> = { matchReasons: [] as string[] };

  if (!ip) return { score: 0, signals: { error: 'No IP provided' } };

  try {
    const ipHourKey = `vel:ip:${ip}:1h`;
    const merchIpDayKey = `vel:merch:${merchantId}:ip:${ip}:24h`;
    const newCustomerBurstKey = `vel:merch:${merchantId}:10m`;

    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;
    const oneDayAgo = now - 86400 * 1000;
    const tenMinsAgo = now - 600 * 1000;

    const uniqueEntry = randomUUID();

    const pipeline = redis.pipeline();

    // 1 hour window for IP
    pipeline.zadd(ipHourKey, now, uniqueEntry);
    pipeline.zremrangebyscore(ipHourKey, 0, oneHourAgo);
    pipeline.zcount(ipHourKey, '-inf', '+inf');
    pipeline.expire(ipHourKey, 3600);

    // 24 hour window for Merchant + IP
    pipeline.zadd(merchIpDayKey, now, uniqueEntry);
    pipeline.zremrangebyscore(merchIpDayKey, 0, oneDayAgo);
    pipeline.zcount(merchIpDayKey, '-inf', '+inf');
    pipeline.expire(merchIpDayKey, 86400);

    // 10 minute window for Merchant
    pipeline.zadd(newCustomerBurstKey, now, uniqueEntry);
    pipeline.zremrangebyscore(newCustomerBurstKey, 0, tenMinsAgo);
    pipeline.zcount(newCustomerBurstKey, '-inf', '+inf');
    pipeline.expire(newCustomerBurstKey, 600);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Pipeline execution failed');
    }

    // results is an array of [error, result]
    // zadd is 0, zremrangebyscore is 1, zcount is 2, expire is 3
    // Indices for zcount: 2, 6, 10
    const ipHourCount = results[2][1] as number;
    const merchIpDayCount = results[6][1] as number;
    const burstCount = results[10][1] as number;

    if (ipHourCount > 10) {
      score += 30;
      signals.matchReasons.push('high_ip_velocity_1h');
    }

    if (merchIpDayCount > 20) {
      score += 20;
      signals.matchReasons.push('high_merchant_ip_velocity_24h');
    }

    if (burstCount > 50) {
      score += 35;
      signals.matchReasons.push('new_customer_burst_10m');
    }

    if (amount > 500 && ipHourCount === 1 && merchIpDayCount === 1) {
      score += 20;
      signals.matchReasons.push('large_amount_new_ip');
    }

  } catch (error) {
    console.error('Redis velocity check failed', error);
    // Instead of failing open (score 0), we assign a moderate baseline risk
    // so transactions aren't auto-approved when infra is down.
    score += 50;
    signals.error = 'velocity_check_failed';
  }

  return { score: Math.min(100, score), signals };
}
