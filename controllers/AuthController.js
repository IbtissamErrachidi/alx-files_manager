import redisClient from '../utils/redis';

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const dbClient = require('../utils/db');

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization || '';
    const base64Credentials = authHeader.split(' ')[1] || '';
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sha1 = crypto.createHash('sha1').update(password).digest('hex');

    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ email, password: sha1 });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();

    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 60 * 60 * 24);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(key);

    return res.status(204).send();
  }
}

module.exports = AuthController;
