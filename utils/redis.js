import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    if (this.client.connected) {
      return true;
    }
    return false;
  }

  async get(key) {
    try {
      const value = await this.getAsync(key);
      return value;
    } catch (err) {
      console.error('Error getting value from Redis', err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.setAsync(key, value, 'EX', duration);
      return true;
    } catch (err) {
      console.error('Error setting value in Redis:', err);
      return false;
    }
  }

  async del(key) {
    try {
      await this.delAsync(key); // Correction ici
      return true;
    } catch (err) {
      console.error('Error deleting key from Redis:', err);
      return false;
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
