import { uploadImage } from "@/app/functions/upload-image";
import { isRight, unwrapEither } from "@/infra/shared/either";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const uploadImageRoute: FastifyPluginAsyncZod = async server => {
  server.post('/uploads', {
    schema: {
      summary: 'Upload an image',
      consumes: ['multipart/form-data'],
      response: {
        201: z.null().describe('Upload successful'),
        400: z.object({
          message: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const uploadFile = await request.file({
      limits: {
        fileSize: 1024 * 1024 * 2, // 2MB
      }
    })

    if(!uploadFile) {
      return reply.status(400).send({ message: 'File is required.'})
    }

    const result = await uploadImage({
      fileName: uploadFile.filename,
      contentType: uploadFile.mimetype,
      contentStream: uploadFile.file
    })

    // truncated: trincado, cortado pela metade
    if (uploadFile.file.truncated) {
      return reply.status(400).send({
        message: 'File size limit reached'
      })
    }

    if(isRight(result)) {
      return reply.status(201).send()
    }

    const error = unwrapEither(result);

    switch(error.constructor.name) {
      case 'InvalidFileFormat':
        return reply.status(400).send({ message: error.message })
    }

  });
};