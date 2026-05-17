import { createFileRoute } from '@tanstack/react-router'
import { auth } from '~/lib/auth'
import { newId } from '~/lib/ids'
import { putObject, validateUpload } from '~/lib/storage.server'

export const Route = createFileRoute('/api/attachments/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        const form = await request.formData()
        const file = form.get('file')
        const sourceType = form.get('sourceType') as string
        const sourceId = form.get('sourceId') as string

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
          validateUpload(file.type || 'application/octet-stream', file.size)
          const bytes = new Uint8Array(await file.arrayBuffer())
          const storageKey = `${sourceType}/${sourceId}/${newId('blob')}`
          await putObject(storageKey, bytes, file.type || 'application/octet-stream')
          const { registerAttachment } = await import(
            '~/server/attachments.functions'
          )
          const id = await registerAttachment({
            sourceType: sourceType as 'invoice' | 'cash_receipt' | 'mileage',
            sourceId,
            storageKey,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
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
