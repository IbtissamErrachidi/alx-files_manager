const crypto = require('crypto');
const dbClient = require('../utils/db');

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

    return res.status(201).json({ id: result.insertedId, email });
  }
}

module.exports = UsersController;
