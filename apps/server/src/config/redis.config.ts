import { ConnectionOptions } from 'bullmq';

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

console.log('✅ Redis connection configured:', {
  host: redisConnection.host,
  port: redisConnection.port,
  hasPassword: !!redisConnection.password,
});
