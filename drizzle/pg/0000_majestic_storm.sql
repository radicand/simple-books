CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"received_on" text NOT NULL,
	"customer_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"method" text DEFAULT 'transfer' NOT NULL,
	"memo" text,
	"created_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_accounts" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"normal" text NOT NULL,
	"created_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"notes" text,
	"created_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"service_product_id" text,
	"description" text NOT NULL,
	"quantity_micro" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"customer_id" text NOT NULL,
	"issued_on" text NOT NULL,
	"due_on" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"memo" text,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"auto_created" boolean DEFAULT false NOT NULL,
	"created_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"memo" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"reversed_by_id" text,
	"created_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"account_code" text NOT NULL,
	"debit_cents" integer DEFAULT 0 NOT NULL,
	"credit_cents" integer DEFAULT 0 NOT NULL,
	"memo" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mileage_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_date" text NOT NULL,
	"miles_micro" integer NOT NULL,
	"rate_micro_per_mile" integer NOT NULL,
	"purpose" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mileage_rates" (
	"tax_year" integer PRIMARY KEY NOT NULL,
	"rate_micro_per_mile" integer NOT NULL,
	"updated_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" text NOT NULL,
	"rate_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" bigint DEFAULT (floor(extract(epoch from now()) * 1000))::bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" bigint,
	"refresh_token_expires_at" bigint,
	"scope" text,
	"password" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" bigint NOT NULL,
	"token" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint,
	"updated_at" bigint
);
--> statement-breakpoint
ALTER TABLE "cash_receipts" ADD CONSTRAINT "cash_receipts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_receipts" ADD CONSTRAINT "cash_receipts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_service_product_id_service_products_id_fk" FOREIGN KEY ("service_product_id") REFERENCES "public"."service_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_code_chart_accounts_code_fk" FOREIGN KEY ("account_code") REFERENCES "public"."chart_accounts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_source_idx" ON "attachments" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "cash_receipts_customer_idx" ON "cash_receipts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "cash_receipts_invoice_idx" ON "cash_receipts" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "cash_receipts_date_idx" ON "cash_receipts" USING btree ("received_on");--> statement-breakpoint
CREATE INDEX "invoice_lines_invoice_idx" ON "invoice_lines" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "journal_entries_date_idx" ON "journal_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "journal_entries_source_idx" ON "journal_entries" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "journal_lines_entry_idx" ON "journal_lines" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "journal_lines_account_idx" ON "journal_lines" USING btree ("account_code");--> statement-breakpoint
CREATE INDEX "mileage_entries_date_idx" ON "mileage_entries" USING btree ("trip_date");