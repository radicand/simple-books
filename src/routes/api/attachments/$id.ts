import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { safeContentDispositionFilename } from '~/lib/attachment-security'
import { db } from '~/db/client'
import { attachments } from '~/db/schema'
import {
  getObjectBytes,
  presignedGetUrl,
} from '~/lib/storage.server'

export const Route = createFileRoute('/api/attachments/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        const [row] = await db
          .select()
          .from(attachments)
          .where(eq(attachments.id, params.id))
        if (!row) {
          return new Response('Not found', { status: 404 })
        }

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
