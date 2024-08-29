const dbClient = require('../utils/db');
import redisClient from '../utils/redis';

class AppController {
  static async getStatus(req, res) {
    try {
      const isRedisAlive = redisClient.isAlive()
      const isDbAlive = dbClient.isAlive();

      res.status(200).json({ redis: isRedisAlive, db: isDbAlive });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getStats(req, res) {
    try {
      const usersCount = await dbClient.nbUsers();
      const filesCount = await dbClient.nbFiles();

      res.status(200).json({ users: usersCount, files: filesCount });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = AppController;
