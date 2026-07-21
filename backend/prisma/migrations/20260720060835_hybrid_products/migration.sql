-- DropForeignKey
ALTER TABLE "quoted_products" DROP CONSTRAINT "quoted_products_template_id_fkey";

-- AlterTable
ALTER TABLE "quoted_products" ADD COLUMN     "catalog_item_id" TEXT,
ADD COLUMN     "item_type" TEXT NOT NULL DEFAULT 'template',
ALTER COLUMN "template_id" DROP NOT NULL,
ALTER COLUMN "width" DROP NOT NULL,
ALTER COLUMN "height" DROP NOT NULL,
ALTER COLUMN "engineering_snapshot" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "quoted_products" ADD CONSTRAINT "quoted_products_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "engineering_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quoted_products" ADD CONSTRAINT "quoted_products_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
