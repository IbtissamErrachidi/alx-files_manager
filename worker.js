import fs from 'fs/promises';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const thumbnails = [500, 250, 100];
const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data || {};
  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

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

userQueue.process(async (job) => {
  const id = job.data;
  if (!id) throw new Error('Missing userId');

  const user = await dbClient.usersColl.findOne({ _id: ObjectId(id) });
  if (!user) throw new Error('User not found');
  job.progress(20);

  console.log(`Welcome ${user.email}`);
});
