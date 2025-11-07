-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "is_temporary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_template_id" TEXT;

-- CreateIndex
CREATE INDEX "Template_is_temporary_expires_at_idx" ON "Template"("is_temporary", "expires_at");
