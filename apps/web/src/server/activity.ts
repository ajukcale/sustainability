import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUS,
  prisma,
  withTenantRls,
  type ActivityCategory,
  type Prisma,
} from "@sustainability/db";
import { HttpError, type AppSession } from "@sustainability/auth";

type Tx = Prisma.TransactionClient;

const STORAGE_ROOT =
  process.env.EVIDENCE_STORAGE_ROOT ?? path.join(process.cwd(), ".data", "evidence");

export function isCategory(v: string): v is ActivityCategory {
  return (ACTIVITY_CATEGORIES as readonly string[]).includes(v);
}

export function contentHashForRow(input: {
  orgUnitId: string;
  category: string;
  periodKey: string;
  quantity: string | number;
  unit: string;
  recordType: string;
}): string {
  const raw = [
    input.orgUnitId,
    input.category,
    input.periodKey,
    String(input.quantity),
    input.unit,
    input.recordType,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

async function assertPeriodWritable(
  tx: Tx,
  tenantId: string,
  periodKey: string,
  category: string,
) {
  const lock = await tx.periodLock.findFirst({
    where: {
      tenantId,
      periodKey,
      OR: [{ category: "*" }, { category }],
    },
  });
  if (lock) {
    throw new HttpError(409, `Dönem kilitli: ${periodKey}`);
  }
}

export async function listActivityData(tenantId: string, filters?: {
  category?: string;
  periodKey?: string;
  status?: string;
}) {
  return withTenantRls(prisma, tenantId, async (tx) =>
    tx.activityData.findMany({
      where: {
        tenantId,
        category: filters?.category,
        periodKey: filters?.periodKey,
        status: filters?.status,
      },
      include: {
        orgUnit: { select: { id: true, name: true, type: true } },
        evidence: true,
      },
      orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
      take: 200,
    }),
  );
}

export async function createActivityManual(opts: {
  app: AppSession & { activeTenantId: string };
  orgUnitId: string;
  category: string;
  periodKey: string;
  quantity: number;
  unit: string;
  recordType?: string;
  notes?: string;
  attributes?: Record<string, unknown>;
  source?: string;
}) {
  if (!isCategory(opts.category)) {
    throw new HttpError(400, "Geçersiz kategori");
  }
  if (!/^\d{4}-\d{2}$/.test(opts.periodKey)) {
    throw new HttpError(400, "periodKey YYYY-MM olmalı");
  }
  if (!(opts.quantity > 0) || Number.isNaN(opts.quantity)) {
    throw new HttpError(400, "Miktar pozitif sayı olmalı");
  }

  const hash = contentHashForRow({
    orgUnitId: opts.orgUnitId,
    category: opts.category,
    periodKey: opts.periodKey,
    quantity: opts.quantity,
    unit: opts.unit,
    recordType: opts.recordType ?? "actual",
  });

  return withTenantRls(prisma, opts.app.activeTenantId, async (tx) => {
    await assertPeriodWritable(
      tx,
      opts.app.activeTenantId,
      opts.periodKey,
      opts.category,
    );

    const org = await tx.orgUnit.findFirst({
      where: { id: opts.orgUnitId, tenantId: opts.app.activeTenantId },
    });
    if (!org) throw new HttpError(404, "Organizasyon birimi bulunamadı");

    const existing = await tx.activityData.findFirst({
      where: {
        tenantId: opts.app.activeTenantId,
        contentHash: hash,
        orgUnitId: opts.orgUnitId,
        category: opts.category,
        periodKey: opts.periodKey,
        recordType: opts.recordType ?? "actual",
      },
    });
    if (existing) {
      throw new HttpError(409, "Aynı kayıt zaten mevcut (yeniden yükleme / dedupe)");
    }

    const row = await tx.activityData.create({
      data: {
        tenantId: opts.app.activeTenantId,
        orgUnitId: opts.orgUnitId,
        category: opts.category,
        periodKey: opts.periodKey,
        quantity: opts.quantity,
        unit: opts.unit.trim(),
        recordType: opts.recordType ?? "actual",
        status: ACTIVITY_STATUS.DRAFT,
        source: opts.source ?? "manual",
        contentHash: hash,
        notes: opts.notes,
        attributes: (opts.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
        createdById: opts.app.user.id,
      },
    });

    await tx.activityRevision.create({
      data: {
        tenantId: opts.app.activeTenantId,
        activityDataId: row.id,
        revision: 1,
        snapshot: {
          quantity: opts.quantity,
          unit: opts.unit,
          status: row.status,
          category: row.category,
          periodKey: row.periodKey,
        },
        changedById: opts.app.user.id,
        changeReason: "create",
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: opts.app.activeTenantId,
        actorId: opts.app.user.id,
        action: "activity.create",
        entityType: "activity_data",
        entityId: row.id,
        metadata: { category: row.category, periodKey: row.periodKey },
      },
    });

    return row;
  });
}

const TRANSITIONS: Record<string, string[]> = {
  draft: ["validated"],
  validated: ["approved", "draft"],
  approved: ["locked", "validated"],
  locked: [],
};

export async function transitionActivity(opts: {
  app: AppSession & { activeTenantId: string };
  id: string;
  toStatus: string;
}) {
  return withTenantRls(prisma, opts.app.activeTenantId, async (tx) => {
    const row = await tx.activityData.findFirst({
      where: { id: opts.id, tenantId: opts.app.activeTenantId },
    });
    if (!row) throw new HttpError(404, "Kayıt bulunamadı");

    const allowed = TRANSITIONS[row.status] ?? [];
    if (!allowed.includes(opts.toStatus)) {
      throw new HttpError(
        400,
        `Geçiş yok: ${row.status} → ${opts.toStatus}`,
      );
    }

    if (opts.toStatus === ACTIVITY_STATUS.LOCKED) {
      await assertPeriodWritable(
        tx,
        opts.app.activeTenantId,
        row.periodKey,
        row.category,
      );
    }

    const updated = await tx.activityData.update({
      where: { id: row.id },
      data: {
        status: opts.toStatus,
        revision: row.revision + 1,
      },
    });

    await tx.activityRevision.create({
      data: {
        tenantId: opts.app.activeTenantId,
        activityDataId: row.id,
        revision: updated.revision,
        snapshot: {
          status: updated.status,
          quantity: String(updated.quantity),
          unit: updated.unit,
        },
        changedById: opts.app.user.id,
        changeReason: `status:${opts.toStatus}`,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: opts.app.activeTenantId,
        actorId: opts.app.user.id,
        action: "activity.status_change",
        entityType: "activity_data",
        entityId: row.id,
        metadata: { from: row.status, to: opts.toStatus },
      },
    });

    return updated;
  });
}

export async function lockPeriod(opts: {
  app: AppSession & { activeTenantId: string };
  periodKey: string;
  category?: string;
  reason?: string;
}) {
  return withTenantRls(prisma, opts.app.activeTenantId, async (tx) => {
    const lock = await tx.periodLock.upsert({
      where: {
        tenantId_periodKey_category: {
          tenantId: opts.app.activeTenantId,
          periodKey: opts.periodKey,
          category: opts.category ?? "*",
        },
      },
      create: {
        tenantId: opts.app.activeTenantId,
        periodKey: opts.periodKey,
        category: opts.category ?? "*",
        lockedById: opts.app.user.id,
        reason: opts.reason,
      },
      update: {
        lockedById: opts.app.user.id,
        reason: opts.reason,
        lockedAt: new Date(),
      },
    });

    await tx.activityData.updateMany({
      where: {
        tenantId: opts.app.activeTenantId,
        periodKey: opts.periodKey,
        status: { in: [ACTIVITY_STATUS.APPROVED, ACTIVITY_STATUS.VALIDATED] },
        ...(opts.category ? { category: opts.category } : {}),
      },
      data: { status: ACTIVITY_STATUS.LOCKED },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: opts.app.activeTenantId,
        actorId: opts.app.user.id,
        action: "period.lock",
        entityType: "period_lock",
        entityId: lock.id,
        metadata: { periodKey: opts.periodKey, category: lock.category },
      },
    });

    return lock;
  });
}

export type CsvRowError = { row: number; message: string; raw?: string };

export function parseActivityCsv(text: string): {
  rows: Array<{
    orgUnitId: string;
    category: string;
    periodKey: string;
    quantity: number;
    unit: string;
    recordType: string;
    notes?: string;
  }>;
  errors: CsvRowError[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: "CSV boş veya yalnızca başlık" }] };
  }

  const header = lines[0]!.toLowerCase().split(",").map((h) => h.trim());
  const required = ["org_unit_id", "category", "period_key", "quantity", "unit"];
  for (const col of required) {
    if (!header.includes(col)) {
      return {
        rows: [],
        errors: [{ row: 0, message: `Eksik sütun: ${col}` }],
      };
    }
  }

  const idx = (name: string) => header.indexOf(name);
  const rows: ReturnType<typeof parseActivityCsv>["rows"] = [];
  const errors: CsvRowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    const category = cols[idx("category")] ?? "";
    const periodKey = cols[idx("period_key")] ?? "";
    const quantity = Number(cols[idx("quantity")]);
    const unit = cols[idx("unit")] ?? "";
    const orgUnitId = cols[idx("org_unit_id")] ?? "";
    const recordType =
      idx("record_type") >= 0 ? cols[idx("record_type")] || "actual" : "actual";
    const notes = idx("notes") >= 0 ? cols[idx("notes")] : undefined;

    if (!orgUnitId || !isCategory(category) || !/^\d{4}-\d{2}$/.test(periodKey)) {
      errors.push({
        row: i + 1,
        message: "org_unit_id / category / period_key geçersiz",
        raw: lines[i],
      });
      continue;
    }
    if (!(quantity > 0) || Number.isNaN(quantity) || !unit) {
      errors.push({
        row: i + 1,
        message: "quantity/unit geçersiz",
        raw: lines[i],
      });
      continue;
    }

    rows.push({
      orgUnitId,
      category,
      periodKey,
      quantity,
      unit,
      recordType: recordType || "actual",
      notes,
    });
  }

  return { rows, errors };
}

export async function importValidatedRows(opts: {
  app: AppSession & { activeTenantId: string };
  fileName: string;
  rows: ReturnType<typeof parseActivityCsv>["rows"];
  preErrors: CsvRowError[];
}) {
  return withTenantRls(prisma, opts.app.activeTenantId, async (tx) => {
    const job = await tx.importJob.create({
      data: {
        tenantId: opts.app.activeTenantId,
        fileName: opts.fileName,
        format: "csv",
        status: "importing",
        totalRows: opts.rows.length + opts.preErrors.length,
        validRows: opts.rows.length,
        errorRows: opts.preErrors.length,
        errors: opts.preErrors,
        createdById: opts.app.user.id,
      },
    });

    let imported = 0;
    const runtimeErrors: CsvRowError[] = [...opts.preErrors];

    for (let i = 0; i < opts.rows.length; i++) {
      const r = opts.rows[i]!;
      try {
        await assertPeriodWritable(
          tx,
          opts.app.activeTenantId,
          r.periodKey,
          r.category,
        );
        const org = await tx.orgUnit.findFirst({
          where: { id: r.orgUnitId, tenantId: opts.app.activeTenantId },
        });
        if (!org) {
          runtimeErrors.push({
            row: i + 2,
            message: "org_unit_id tenant içinde yok",
          });
          continue;
        }
        const hash = contentHashForRow(r);
        const dup = await tx.activityData.findFirst({
          where: {
            tenantId: opts.app.activeTenantId,
            contentHash: hash,
            orgUnitId: r.orgUnitId,
            category: r.category,
            periodKey: r.periodKey,
            recordType: r.recordType,
          },
        });
        if (dup) {
          runtimeErrors.push({
            row: i + 2,
            message: "Dedupe: kayıt zaten var",
          });
          continue;
        }

        const created = await tx.activityData.create({
          data: {
            tenantId: opts.app.activeTenantId,
            orgUnitId: r.orgUnitId,
            category: r.category,
            periodKey: r.periodKey,
            quantity: r.quantity,
            unit: r.unit,
            recordType: r.recordType,
            status: ACTIVITY_STATUS.DRAFT,
            source: "csv",
            sourceRef: opts.fileName,
            contentHash: hash,
            notes: r.notes,
            createdById: opts.app.user.id,
          },
        });
        await tx.activityRevision.create({
          data: {
            tenantId: opts.app.activeTenantId,
            activityDataId: created.id,
            revision: 1,
            snapshot: { ...r, status: "draft" },
            changedById: opts.app.user.id,
            changeReason: "import",
          },
        });
        imported += 1;
      } catch (e) {
        runtimeErrors.push({
          row: i + 2,
          message: e instanceof Error ? e.message : "import hatası",
        });
      }
    }

    const updated = await tx.importJob.update({
      where: { id: job.id },
      data: {
        status: runtimeErrors.length && !imported ? "failed" : "completed",
        importedRows: imported,
        errorRows: runtimeErrors.length,
        errors: runtimeErrors,
        completedAt: new Date(),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: opts.app.activeTenantId,
        actorId: opts.app.user.id,
        action: "activity.import",
        entityType: "import_job",
        entityId: job.id,
        metadata: { imported, errors: runtimeErrors.length, fileName: opts.fileName },
      },
    });

    return updated;
  });
}

export async function attachEvidence(opts: {
  app: AppSession & { activeTenantId: string };
  activityDataId: string;
  fileName: string;
  mimeType?: string;
  bytes: Buffer;
}) {
  const tenantId = opts.app.activeTenantId;
  return withTenantRls(prisma, tenantId, async (tx) => {
    const activity = await tx.activityData.findFirst({
      where: { id: opts.activityDataId, tenantId },
    });
    if (!activity) throw new HttpError(404, "Aktivite bulunamadı");
    if (activity.status === ACTIVITY_STATUS.LOCKED) {
      throw new HttpError(409, "Kilitli kayda kanıt eklenemez");
    }

    const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${tenantId}/${activity.id}/${Date.now()}-${safeName}`;
    const abs = path.join(STORAGE_ROOT, storageKey);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, opts.bytes);

    const file = await tx.evidenceFile.create({
      data: {
        tenantId,
        activityDataId: activity.id,
        orgUnitId: activity.orgUnitId,
        fileName: opts.fileName,
        storageKey,
        mimeType: opts.mimeType,
        sizeBytes: opts.bytes.length,
        uploadedById: opts.app.user.id,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId,
        actorId: opts.app.user.id,
        action: "evidence.upload",
        entityType: "evidence_file",
        entityId: file.id,
        metadata: { activityDataId: activity.id, fileName: opts.fileName },
      },
    });

    return file;
  });
}

export const CSV_TEMPLATE = `org_unit_id,category,period_key,quantity,unit,record_type,notes
ORG_UNIT_ID,energy,2026-01,1000,kWh,actual,Elektrik tüketimi
`;
