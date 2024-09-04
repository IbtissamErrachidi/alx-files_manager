import fs from 'fs/promises';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');
const thumbnails = [500, 250, 100];

fileQueue.process(async (job) => {
  job.progress(0);

  const { fileId, userId } = job.data || {};
  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');
  job.progress(10);

  const file = await dbClient.filesColl
    .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

  if (!file) throw new Error('File not found');
  job.progress(20);

  try {
    const imgBuff = await fs.readFile(file.localPath);
    job.progress(30);

    thumbnails.forEach(async (width, index) => {
      const thumbnail = await imageThumbnail(imgBuff, { width });
      await fs.writeFile(`${file.localPath}_${width}`, thumbnail);
      job.progress(50 + 20 * index);
    });
  } catch (err) {
    throw new Error('File not found');
  }
});
