import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { safeContentDispositionFilename } from '~/lib/attachment-security'
import { attachments } from '~/db/schema'

export const Route = createFileRoute('/api/attachments/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { auth } = await import('~/lib/auth')
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        const { db } = await import('~/db/client')
        const [row] = await db
          .select()
          .from(attachments)
          .where(eq(attachments.id, params.id))
        if (!row) {
          return new Response('Not found', { status: 404 })
        }

        const { presignedGetUrl, getObjectBytes } = await import(
          '~/lib/storage.server'
        )
        const signed = await presignedGetUrl(row.storageKey)
        if (signed) {
          return Response.redirect(signed, 302)
        }

        const bytes = await getObjectBytes(row.storageKey)
        return new Response(bytes, {
          headers: {
            'Content-Type': row.mimeType,
            'Content-Disposition': safeContentDispositionFilename(row.fileName),
          },
        })
      },
    },
  },
})
