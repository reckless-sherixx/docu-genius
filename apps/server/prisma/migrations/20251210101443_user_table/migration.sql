/*
  Warnings:

  - The values [OWNER,MEMBER] on the enum `MemberRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MemberRole_new" AS ENUM ('ADMIN', 'CREATOR');
ALTER TABLE "public"."OrganizationInvite" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."OrganizationMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "OrganizationMember" ALTER COLUMN "role" TYPE "MemberRole_new" USING ("role"::text::"MemberRole_new");
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" TYPE "MemberRole_new" USING ("role"::text::"MemberRole_new");
ALTER TYPE "MemberRole" RENAME TO "MemberRole_old";
ALTER TYPE "MemberRole_new" RENAME TO "MemberRole";
DROP TYPE "public"."MemberRole_old";
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" SET DEFAULT 'CREATOR';
ALTER TABLE "OrganizationMember" ALTER COLUMN "role" SET DEFAULT 'CREATOR';
COMMIT;

-- AlterTable
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" SET DEFAULT 'CREATOR';

-- AlterTable
ALTER TABLE "OrganizationMember" ALTER COLUMN "role" SET DEFAULT 'CREATOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "document_generation_pin" INTEGER;
