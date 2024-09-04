import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { ObjectId } from 'mongodb';
import Queue from 'bull';
import mime from 'mime-types';
import dbClient from '../utils/db';
import { getUser } from '../utils/auth';
import { sendStatus } from '../utils/httpres';

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
const projection = {
  _id: 0,
  id: '$_id',
  userId: 1,
  name: 1,
  type: 1,
  isPublic: 1,
  parentId: 1,
};

class FilesController {
  static async postUpload(request, response) {
    const user = await getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name, type, parentId, isPublic = false, data,
    } = request.body;

    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return response.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return response.status(400).json({ error: 'Missing data' });
    }

    const files = dbClient.db.collection('files');
    if (parentId) {
      const idObject = new ObjectId(parentId);
      const file = await files.findOne({ _id: idObject, userId: user._id });
      if (!file) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      try {
        const result = await files.insertOne({
          userId: user._id,
          name,
          type,
          parentId: parentId || 0,
          isPublic,
        });
        response.status(201).json({
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
        });
      } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const fileName = `${filePath}/${uuidv4()}`;
      const buff = Buffer.from(data, 'base64');

      try {
        try {
          await fs.mkdir(filePath);
        } catch (error) {
          // Pass. Error raised when file already exists
        }
        await fs.writeFile(fileName, buff, 'utf-8');
        const result = await files.insertOne({
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          localPath: fileName,
        });
        response.status(201).json({
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
        });
        if (type === 'image') {
          fileQueue.add({
            userId: user._id,
            fileId: result.insertedId,
          });
        }
      } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Internal Server Error' });
      }
    }
    return null;
  }

  /**
   * GET /files/:id
   * retrieve a file document based on Id
   *
   * @param {import("express").Request} request :the request object
   * @param {import("express").Response} response :the response object
   */
  static async getShow(request, response) {
    const user = await getUser(request);
    const { id } = request.params;
    if (!user) return sendStatus(401, response);
    if (!ObjectId.isValid(id)) return sendStatus(404, response);

    const file = await dbClient.filesColl
      .findOne({ _id: ObjectId(id) }, { projection });
    if (file && (file.userId.equals(user._id) || file.isPublic)) {
      return response.json(file);
    }
    return sendStatus(404, response);
  }

  /**
   * GET /files/
   * retrieve all file documents for current user
   *
   * @param {import("express").Request} request :the request object
   * @param {import("express").Response} response :the response object
   */
  static async getIndex(request, response) {
    const user = await getUser(request);
    if (!user) return sendStatus(401, response);

    let parentId = request.query.parentId || { $ne: null };
    if (parentId === '0') parentId = 0;
    else if (ObjectId.isValid(parentId)) parentId = ObjectId(parentId);
    const page = Math.floor(Number(`0${request.query.page}`)) || 0;

    const pipeline = [
      { $match: { parentId, userId: user._id } },
      { $skip: page * 20 },
      { $limit: 20 },
      { $project: projection },
    ];

    const all = await dbClient.filesColl.aggregate(pipeline).toArray();
    return response.json(all);
  }

  /**
   * set the privacy level of a file document
   *
   * @param {import("express").Request} request : the request object
   * @param {import("express").Response} response : the response object
   * @param {boolean} isPublic : true or false
   */
  static async setPublish(request, response, isPublic) {
    const user = await getUser(request);
    if (!user) return sendStatus(401, response);
    const { id } = request.params;
    if (!ObjectId.isValid(id)) return sendStatus(404, response);

    const result = await dbClient.filesColl.findOneAndUpdate(
      { _id: ObjectId(id), userId: user._id },
      { $set: { isPublic } },
      { projection },
    );
    if (!result.value) return sendStatus(404, response);
    return response.json({ ...result.value, isPublic });
  }

  /**
   * GET /files/:id/publish
   * make a file public
   *
   * @param {import("express").Request} request :the request object
   * @param {import("express").Response} response :the response object
   */
  static putPublish(request, response) {
    return FilesController.setPublish(request, response, true);
  }

  /**
   * GET /files/:id/unpublish
   * make the file private
   *
   * @param {import("express").Request} request :the request object
   * @param {import("express").Response} response :the response object
   */
  static putUnpublish(request, response) {
    return FilesController.setPublish(request, response, false);
  }

  /**
   * GET /files/:id/data
   * retrieve a file document based on Id
   *
   * @param {import("express").Request} request :the request object
   * @param {import("express").Response} response :the response object
   */
  static async getFile(request, response) {
    const { id } = request.params;
    if (!ObjectId.isValid(id)) return sendStatus(404, response);

    const file = await dbClient.filesColl.findOne({ _id: ObjectId(id) });
    const size = request.query.size ? `_${request.query.size}` : '';
    if (file) {
      const args = [
        file.localPath + size,
        file.name,
        { headers: { 'Content-Type': mime.lookup(file.name) } },
        (err) => err && sendStatus(404, response),
      ];
      if (file.type === 'folder') {
        return response.status(400).json({ error: "A folder doesn't have content" });
      }

      if (file.isPublic) return response.download(...args);

      const user = await getUser(request);
      if (user && file.userId.equals(user._id)) {
        return response.download(...args);
      }
    }
    return sendStatus(404, response);
  }
}

module.exports = FilesController;
