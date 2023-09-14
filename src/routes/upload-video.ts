import { FastifyInstance } from 'fastify';
import { fastifyMultipart } from '@fastify/multipart';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { prisma } from '../lib/prisma';
import fs from 'node:fs';

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25mb
    },
  });

  app.post('/videos', async (req, res) => {
    const data = await req.file();

    if (!data) {
      return res.status(400).send({ message: 'Missing file input.' });
    }

    const extensions = path.extname(data.filename);

    if (extensions !== 'mp3') {
      return res
        .status(400)
        .send({ message: 'Invalid input type, please upload a MP3.' });
    }

    const fileBaseName = path.basename(data.filename, extensions);

    const fileUploadName = `${fileBaseName}-${randomUUID()}${extensions}`;

    const uploadDestination = path.resolve(
      __dirname,
      '../../temp',
      fileUploadName,
    );

    await pump(data.file, fs.createWriteStream(uploadDestination));

    const video = await prisma.video.create({
      data: {
        name: data.fieldname,
        path: uploadDestination,
      },
    });

    return video;
  });
}
