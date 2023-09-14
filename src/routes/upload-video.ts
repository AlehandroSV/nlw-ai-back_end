import { FastifyInstance } from 'fastify';
import { fastifyMultipart } from '@fastify/multipart';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { prisma } from '../lib/prisma';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

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

    if (extensions !== '.mp3') {
      return res.status(400).send({
        message: 'Invalid input type, please upload a MP3.',
        extensions: extensions.toString(),
      });
    }

    const fileBaseName = path.basename(data.filename, extensions);

    const fileUploadName = `${fileBaseName}-${randomUUID()}${extensions}`;

    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);

    const uploadDestination = path.resolve(
      currentDir,
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
