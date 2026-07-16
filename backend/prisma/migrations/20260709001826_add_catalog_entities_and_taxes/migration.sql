-- CreateTable
CREATE TABLE "tax_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_systems" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_finishes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "price_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_finishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "weight_per_meter" DECIMAL(6,3),
    "standard_length" DECIMAL(5,2),
    "system_id" TEXT,
    "thickness_mm" DECIMAL(4,1),
    "glass_type" TEXT,
    "weight_per_m2" DECIMAL(6,3),

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_settings_tenant_id_idx" ON "tax_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_settings_tenant_id_name_key" ON "tax_settings"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "catalog_systems_tenant_id_idx" ON "catalog_systems"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_systems_tenant_id_name_key" ON "catalog_systems"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "catalog_finishes_tenant_id_idx" ON "catalog_finishes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_finishes_tenant_id_name_key" ON "catalog_finishes"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "catalog_items_tenant_id_idx" ON "catalog_items"("tenant_id");

-- CreateIndex
CREATE INDEX "catalog_items_type_idx" ON "catalog_items"("type");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_tenant_id_code_key" ON "catalog_items"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "tax_settings" ADD CONSTRAINT "tax_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_systems" ADD CONSTRAINT "catalog_systems_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_finishes" ADD CONSTRAINT "catalog_finishes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "catalog_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
