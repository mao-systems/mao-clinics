-- CreateTable
CREATE TABLE "specialties" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "specialties_tenant_id_idx" ON "specialties"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_tenant_id_name_key" ON "specialties"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "specialties" ADD CONSTRAINT "specialties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
