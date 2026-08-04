-- AlterTable
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "tracking_token" TEXT,
ADD COLUMN IF NOT EXISTS "open_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "first_opened_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "last_opened_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "email_messages_tracking_token_key" ON "email_messages"("tracking_token");

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_open_events" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "ip_hash" TEXT,

    CONSTRAINT "email_open_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_open_events_message_id_opened_at_idx" ON "email_open_events"("message_id", "opened_at");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_open_events_message_id_fkey'
  ) THEN
    ALTER TABLE "email_open_events" ADD CONSTRAINT "email_open_events_message_id_fkey"
      FOREIGN KEY ("message_id") REFERENCES "email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
