-- CreateTable
CREATE TABLE "activity_data" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "org_unit_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "record_type" TEXT NOT NULL DEFAULT 'actual',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "source_ref" TEXT,
    "content_hash" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "attributes" JSONB,
    "quality_flag" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_revisions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "activity_data_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by_id" TEXT,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_locks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '*',
    "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_by_id" TEXT,
    "reason" TEXT,

    CONSTRAINT "period_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'csv',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "activity_data_id" TEXT,
    "org_unit_id" TEXT,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_data_tenant_id_idx" ON "activity_data"("tenant_id");

-- CreateIndex
CREATE INDEX "activity_data_tenant_id_period_key_idx" ON "activity_data"("tenant_id", "period_key");

-- CreateIndex
CREATE INDEX "activity_data_tenant_id_category_status_idx" ON "activity_data"("tenant_id", "category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "activity_data_tenant_id_org_unit_id_category_period_key_rec_key" ON "activity_data"("tenant_id", "org_unit_id", "category", "period_key", "record_type", "content_hash");

-- CreateIndex
CREATE INDEX "activity_revisions_tenant_id_idx" ON "activity_revisions"("tenant_id");

-- CreateIndex
CREATE INDEX "activity_revisions_activity_data_id_idx" ON "activity_revisions"("activity_data_id");

-- CreateIndex
CREATE INDEX "period_locks_tenant_id_idx" ON "period_locks"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "period_locks_tenant_id_period_key_category_key" ON "period_locks"("tenant_id", "period_key", "category");

-- CreateIndex
CREATE INDEX "import_jobs_tenant_id_idx" ON "import_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "evidence_files_tenant_id_idx" ON "evidence_files"("tenant_id");

-- CreateIndex
CREATE INDEX "evidence_files_activity_data_id_idx" ON "evidence_files"("activity_data_id");

-- AddForeignKey
ALTER TABLE "activity_data" ADD CONSTRAINT "activity_data_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_data" ADD CONSTRAINT "activity_data_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_data" ADD CONSTRAINT "activity_data_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_revisions" ADD CONSTRAINT "activity_revisions_activity_data_id_fkey" FOREIGN KEY ("activity_data_id") REFERENCES "activity_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_activity_data_id_fkey" FOREIGN KEY ("activity_data_id") REFERENCES "activity_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- RLS for Phase 2 tenant-scoped tables
ALTER TABLE "activity_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_data" FORCE ROW LEVEL SECURITY;
CREATE POLICY activity_data_isolation ON "activity_data"
  USING (
    current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)
  );

ALTER TABLE "activity_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_revisions" FORCE ROW LEVEL SECURITY;
CREATE POLICY activity_revisions_isolation ON "activity_revisions"
  USING (
    current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)
  );

ALTER TABLE "period_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "period_locks" FORCE ROW LEVEL SECURITY;
CREATE POLICY period_locks_isolation ON "period_locks"
  USING (
    current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)
  );

ALTER TABLE "import_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY import_jobs_isolation ON "import_jobs"
  USING (
    current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)
  );

ALTER TABLE "evidence_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence_files" FORCE ROW LEVEL SECURITY;
CREATE POLICY evidence_files_isolation ON "evidence_files"
  USING (
    current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)
  );
