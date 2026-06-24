import { createFileRoute } from '@tanstack/react-router'
import {
  assertSafeSourceId,
  buildStorageKey,
} from '~/lib/attachment-security'
import { newId } from '~/lib/ids'

export const Route = createFileRoute('/api/attachments/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { auth } = await import('~/lib/auth')
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        const form = await request.formData()
        const file = form.get('file')
        const sourceType = form.get('sourceType') as string
        const sourceId = String(form.get('sourceId') ?? '').trim()

        if (!(file instanceof File)) {
          return Response.json({ message: 'Missing file.' }, { status: 400 })
        }
        if (
          !['invoice', 'cash_receipt', 'mileage'].includes(sourceType) ||
          !sourceId
        ) {
          return Response.json(
            { message: 'sourceType and sourceId required.' },
            { status: 400 },
          )
        }

        try {
          assertSafeSourceId(sourceId)
          const typedSource = sourceType as
            | 'invoice'
            | 'cash_receipt'
            | 'mileage'

          const { assertSourceExists } = await import(
            '~/server/attachments.server'
          )
          const canonicalSourceId = await assertSourceExists(
            typedSource,
            sourceId,
          )

          const {
            ALLOWED_MIME_TYPES,
            putObject,
            validateUploadBytes,
          } = await import('~/lib/storage.server')
          const declared = (file.type || 'application/octet-stream') as string
          if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(declared)) {
            throw new Error('Only JPEG, PNG, WebP, and PDF files are allowed.')
          }

          const bytes = new Uint8Array(await file.arrayBuffer())
          validateUploadBytes(bytes, declared)

          const storageKey = buildStorageKey(
            typedSource,
            canonicalSourceId,
            newId('blob'),
          )
          await putObject(storageKey, bytes, declared)
          const { registerAttachment } = await import(
            '~/server/attachments.server'
          )
          const id = await registerAttachment({
            sourceType: typedSource,
            sourceId: canonicalSourceId,
            storageKey,
            fileName: file.name,
            mimeType: declared,
            sizeBytes: file.size,
          })
          return Response.json({ id, storageKey })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          return Response.json({ message }, { status: 400 })
        }
      },
    },
  },
})
