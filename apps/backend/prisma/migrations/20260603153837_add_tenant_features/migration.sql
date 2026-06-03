-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "features" JSONB NOT NULL DEFAULT '{}';
