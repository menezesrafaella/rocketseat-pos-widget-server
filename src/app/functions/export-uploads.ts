import { db, pg } from "@/infra/db";
import { schema } from "@/infra/db/schemas";
import { Either, makeRight } from "@/infra/shared/either";
import { uploadFileToStorage } from "@/infra/storage/upload-file-to-storage";
import { stringify } from "csv-stringify";
import { ilike } from "drizzle-orm";
import { PassThrough, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { z } from "zod";

const exportUploadsInput = z.object({
    searchQuery: z.string().optional(),
})

type ExportUploadsInput = z.input<typeof exportUploadsInput>

type ExportUploadsOutput = {
    reportUrl: string;
}

export async function exportUploads(input: ExportUploadsInput): Promise<Either<never, ExportUploadsOutput>> {
    const { searchQuery } = exportUploadsInput.parse(input)

   const { sql, params } = await db
    .select({
        id: schema.uploads.id,
        name: schema.uploads.name,
        remoteKey: schema.uploads.remoteKey,
        remoteUrl: schema.uploads.remoteUrl,
        createdAt: schema.uploads.createdAt,
    })
    .from(schema.uploads)
    .where(searchQuery ? ilike(schema.uploads.name, `%${searchQuery}%`) : undefined)
    .toSQL();

    // CURSOR: retorna os dados de pouco em pouco até chegando no final. Drizze não tem suporte para o cursor. O drizze faz a sanitização para não ter problemas com SQL Injection

    const cursor = pg.unsafe(sql, params as string[]).cursor(50); // é possível escolher uma quantidade, o ideal é começar com pouco como 50

    // for await (const rows of cursor) {
    //     console.log(rows)
    // }

    const csv = stringify({
        delimiter: ',',
        header: true,
        columns: [
            { key: 'id', header: 'ID' },
            { key: 'name', header: 'Name' },
            { key: 'remote_key', header: 'Remote Key' },
            { key: 'remote_url', header: 'Remote URL' },
            { key: 'created_at', header: 'Created At' },
        ]
    })

    const uploadToStorageStream = new PassThrough();

    const convertToCSVPipeline = pipeline(
        cursor,
        new Transform({
        objectMode: true,
        transform(chunks: unknown[], encoding, callback) {
            for (const chunk of chunks) {
            this.push(chunk)
            }

            callback()
        },
        }),
        csv,
        uploadToStorageStream
   )

    const uploadToStorage = uploadFileToStorage({
        contentType: 'text/csv',
        folder: 'downloads',
        fileName: `${Date.now()}-uploads.csv`,
        contentStream: uploadToStorageStream
    })

    await Promise.all([
        uploadToStorage,
        convertToCSVPipeline,
    ])

    const [{ url }] = await Promise.all([uploadToStorage, convertToCSVPipeline])

    return makeRight({ reportUrl: url })
}