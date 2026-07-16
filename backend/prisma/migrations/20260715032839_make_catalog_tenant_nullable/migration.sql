-- AlterTable
ALTER TABLE "catalog_finishes" ALTER COLUMN "tenant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "catalog_items" ALTER COLUMN "tenant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "catalog_systems" ALTER COLUMN "tenant_id" DROP NOT NULL;
