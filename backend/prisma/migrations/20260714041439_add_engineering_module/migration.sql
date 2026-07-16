-- CreateEnum
CREATE TYPE "VariableType" AS ENUM ('NUMBER', 'STRING', 'BOOLEAN', 'LIST');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('PROFILE', 'GLASS', 'ACCESSORY', 'SUPPLY', 'LABOR');

-- CreateEnum
CREATE TYPE "RuleAction" AS ENUM ('INCLUDE', 'EXCLUDE', 'OVERRIDE_FORMULA');

-- CreateTable
CREATE TABLE "engineering_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "system_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source_template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineering_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineering_variables" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "VariableType" NOT NULL,
    "default_value" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "min_value" DECIMAL(10,2),
    "max_value" DECIMAL(10,2),
    "list_options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineering_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineering_components" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "catalog_item_id" TEXT,
    "type" "ComponentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineering_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineering_formulas" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "quantity_formula" TEXT NOT NULL DEFAULT '1',
    "width_formula" TEXT,
    "height_formula" TEXT,
    "length_formula" TEXT,
    "area_formula" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineering_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineering_rules" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "action" "RuleAction" NOT NULL,
    "override_formula" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineering_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "engineering_templates_tenant_id_idx" ON "engineering_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "engineering_templates_source_template_id_idx" ON "engineering_templates"("source_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "engineering_templates_tenant_id_code_key" ON "engineering_templates"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "engineering_variables_template_id_idx" ON "engineering_variables"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "engineering_variables_template_id_name_key" ON "engineering_variables"("template_id", "name");

-- CreateIndex
CREATE INDEX "engineering_components_template_id_idx" ON "engineering_components"("template_id");

-- CreateIndex
CREATE INDEX "engineering_components_catalog_item_id_idx" ON "engineering_components"("catalog_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "engineering_formulas_component_id_key" ON "engineering_formulas"("component_id");

-- CreateIndex
CREATE INDEX "engineering_rules_component_id_idx" ON "engineering_rules"("component_id");

-- AddForeignKey
ALTER TABLE "engineering_templates" ADD CONSTRAINT "engineering_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_templates" ADD CONSTRAINT "engineering_templates_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "catalog_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_templates" ADD CONSTRAINT "engineering_templates_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "engineering_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_variables" ADD CONSTRAINT "engineering_variables_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "engineering_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_components" ADD CONSTRAINT "engineering_components_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "engineering_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_components" ADD CONSTRAINT "engineering_components_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_formulas" ADD CONSTRAINT "engineering_formulas_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "engineering_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_rules" ADD CONSTRAINT "engineering_rules_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "engineering_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
