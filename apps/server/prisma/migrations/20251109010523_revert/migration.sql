/*
  Warnings:

  - You are about to drop the column `editable_s3_key` on the `Template` table. All the data in the column will be lost.
  - You are about to drop the column `editable_s3_url` on the `Template` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Template" DROP COLUMN "editable_s3_key",
DROP COLUMN "editable_s3_url";
