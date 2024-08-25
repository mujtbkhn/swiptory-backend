const redis = require('redis');
const NodeCache = require('node-cache');
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisClient = redis.createClient({
  url: REDIS_URL
});

const nodeCache = new NodeCache();

let useRedis = false;

redisClient.on('error', (err) => {
  console.log('Redis Client Error:', err);
  useRedis = false;
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
  useRedis = true;
});

const connectToRedis = async () => {
  try {
    await redisClient.connect();
    useRedis = true;
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    useRedis = false;
    throw err; // Rethrow the error to be caught in index.js
  }
};

const get = async (key) => {
  if (useRedis) {
    try {
      return await redisClient.get(key);
    } catch (err) {
      console.error('Error getting data from Redis:', err);
    }
  }
  return nodeCache.get(key);
};

const set = async (key, value, ttl) => {
  if (useRedis) {
    try {
      await redisClient.set(key, value);
      await redisClient.expire(key, ttl);
    } catch (err) {
      console.error('Error setting data in Redis:', err);
    }
  }
  nodeCache.set(key, value, ttl);
};

module.exports = {
  connectToRedis,
  get,
  set
};