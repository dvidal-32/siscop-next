-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "price_list_level" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "engineering_templates" ADD COLUMN     "area_price_l1" DECIMAL(10,2),
ADD COLUMN     "area_price_l2" DECIMAL(10,2),
ADD COLUMN     "area_price_l3" DECIMAL(10,2),
ADD COLUMN     "area_price_l4" DECIMAL(10,2),
ADD COLUMN     "area_unit" TEXT NOT NULL DEFAULT 'm2',
ADD COLUMN     "pricing_method" TEXT NOT NULL DEFAULT 'cost';

-- AlterTable
ALTER TABLE "quoted_products" ADD COLUMN     "applied_price_list" INTEGER,
ADD COLUMN     "area" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "pricing_method" TEXT NOT NULL DEFAULT 'cost';

-- CreateTable
CREATE TABLE "template_minimum_areas" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "bodies" INTEGER NOT NULL,
    "min_area" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_minimum_areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_minimum_areas_template_id_bodies_key" ON "template_minimum_areas"("template_id", "bodies");

-- AddForeignKey
ALTER TABLE "template_minimum_areas" ADD CONSTRAINT "template_minimum_areas_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "engineering_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
