import { ObjectId } from 'mongodb';
import Queue from 'bull';
import crypto from 'crypto';

import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const userQueue = new Queue('userQueue');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ email });

    if (user) return res.status(400).json({ error: 'Already exist' });

    const hash = crypto.createHash('sha1').update(password).digest('hex');
    const result = await usersCollection.insertOne({ email, password: hash });

    userQueue.add(result.insertedId);
    return res.status(201).json({ id: result.insertedId, email });
  }

  static async getMe(request, response) {
    try {
      const token = request.header('X-Token');
      if (!token) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        console.log('Token not found in Redis!');
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const users = dbClient.db.collection('users');
      const idObject = new ObjectId(userId);
      const user = await users.findOne({ _id: idObject });

      if (!user) {
        console.log('User not found!');
        return response.status(401).json({ error: 'Unauthorized' });
      }

      return response.status(200).json({ id: userId, email: user.email });
    } catch (error) {
      console.error('Error in getMe:', error);
      return response.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = UsersController;
