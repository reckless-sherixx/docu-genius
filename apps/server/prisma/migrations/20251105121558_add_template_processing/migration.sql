-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('TEXT_PDF', 'SCANNED_PDF', 'IMAGE');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'DATE', 'NUMBER', 'EMAIL', 'PHONE', 'ADDRESS', 'SIGNATURE', 'CUSTOM');

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "extracted_text" TEXT,
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processing_completed_at" TIMESTAMP(3),
ADD COLUMN     "processing_error" TEXT,
ADD COLUMN     "processing_started_at" TIMESTAMP(3),
ADD COLUMN     "status" "TemplateStatus" NOT NULL DEFAULT 'UPLOADING',
ADD COLUMN     "template_type" "TemplateType",
ADD COLUMN     "total_pages" INTEGER;

-- CreateTable
CREATE TABLE "TemplateField" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "field_name" VARCHAR(191) NOT NULL,
    "field_type" "FieldType" NOT NULL DEFAULT 'TEXT',
    "placeholder" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "default_value" TEXT,
    "validation_rules" JSONB,
    "position_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_url" TEXT NOT NULL,
    "changes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateField_template_id_idx" ON "TemplateField"("template_id");

-- CreateIndex
CREATE INDEX "TemplateVersion_template_id_idx" ON "TemplateVersion"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_template_id_version_key" ON "TemplateVersion"("template_id", "version");

-- CreateIndex
CREATE INDEX "Template_status_idx" ON "Template"("status");

-- AddForeignKey
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
