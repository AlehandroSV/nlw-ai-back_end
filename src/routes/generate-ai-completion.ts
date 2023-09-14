import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { openai } from '../lib/openia';
import { z } from 'zod';
import { OpenAIStream, streamToResponse } from 'ai';

export async function generateAICompletionRoute(app: FastifyInstance) {
  app.post('/ai/generate', async (req, res) => {
    const bodySchema = z.object({
      videoId: z.string(),
      template: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    });

    const { videoId, template, temperature } = bodySchema.parse(req.body);

    const video = await prisma.video.findFirstOrThrow({
      where: {
        id: videoId,
      },
    });

    if (!video.transcription) {
      return res
        .status(400)
        .send({ error: 'Video transcription was not generated yet.' });
    }

    const promptMessage = template.replace(
      '{transcription}',
      video.transcription,
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      temperature,
      messages: [
        {
          role: 'user',
          content: promptMessage,
        },
      ],
      stream: true,
    });

    const stream = OpenAIStream(response);

    streamToResponse(stream, res.raw, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE',
      },
    });
  });
}
