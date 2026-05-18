ALTER TABLE "account" ALTER COLUMN "access_token_expires_at" SET DATA TYPE timestamp USING CASE WHEN "access_token_expires_at" IS NULL THEN NULL ELSE to_timestamp("access_token_expires_at"::double precision / 1000) END;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE timestamp USING CASE WHEN "refresh_token_expires_at" IS NULL THEN NULL ELSE to_timestamp("refresh_token_expires_at"::double precision / 1000) END;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DATA TYPE timestamp USING to_timestamp("created_at"::double precision / 1000);--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DATA TYPE timestamp USING to_timestamp("updated_at"::double precision / 1000);--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp USING to_timestamp("expires_at"::double precision / 1000);--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DATA TYPE timestamp USING to_timestamp("created_at"::double precision / 1000);--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DATA TYPE timestamp USING to_timestamp("updated_at"::double precision / 1000);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DATA TYPE timestamp USING to_timestamp("created_at"::double precision / 1000);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp USING to_timestamp("updated_at"::double precision / 1000);--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "expires_at" SET DATA TYPE timestamp USING to_timestamp("expires_at"::double precision / 1000);--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DATA TYPE timestamp USING CASE WHEN "created_at" IS NULL THEN NULL ELSE to_timestamp("created_at"::double precision / 1000) END;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DATA TYPE timestamp USING CASE WHEN "updated_at" IS NULL THEN NULL ELSE to_timestamp("updated_at"::double precision / 1000) END;