---
name: document-storage
description: Documents local and S3 attachment storage, upload API, and cleanup for simple-books. Use when working with file uploads, attachments, Garage/S3 config, or IRS retention.
---

# Document storage

## Config

`.env.example`: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `UPLOAD_MAX_BYTES`.

- S3 set → Garage-compatible via `@aws-sdk/client-s3` (`forcePathStyle: true`)
- Unset → `./data/uploads/<storage_key>`

## API

- `POST /api/attachments/upload` — multipart: `file`, `sourceType`, `sourceId`
- `GET /api/attachments/:id` — stream (local) or redirect (presigned S3)

## DB

`attachments` table links `source_type` + `source_id` to `storage_key`.

## UI

- `PendingFileField` on invoice/receipt/mileage create forms
- `uploadPendingAttachment(file, type, id)` after record create
- IRS retention banner on Settings when `S3_ENDPOINT` is set

## Cleanup

`deleteAttachmentsForSource` on receipt/mileage delete and invoice void.
