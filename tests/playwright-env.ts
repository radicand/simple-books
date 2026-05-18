import { createServer } from 'node:net'

/** Resolves to an ephemeral TCP port on 127.0.0.1. */
export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close()
        reject(new Error('Could not bind ephemeral port'))
        return
      }
      const { port } = addr
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
  })
}
