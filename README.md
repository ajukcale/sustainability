# Sürdürülebilirlik / Sustainability

Multi-tenant sustainability SaaS (carbon footprint + operational resource efficiency).

Phase 0: monorepo foundation — Next.js app, Prisma schema with `tenant_id`, auth stub, health/ready probes, CI, and local Postgres via Docker Compose.

---

## Türkçe

### Gereksinimler

- Node.js 20+
- [pnpm](https://pnpm.io) 10+
- Docker (PostgreSQL için)

### Hızlı başlangıç

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Uygulama: [http://localhost:3000](http://localhost:3000)

- Canlılık: `GET /api/health`
- Hazırlık (DB): `GET /api/ready`

### Monorepo yapısı

| Yol | Paket | Açıklama |
|---|---|---|
| `apps/web` | `@sustainability/web` | Next.js App Router |
| `packages/db` | `@sustainability/db` | Prisma + PostgreSQL |
| `packages/auth` | `@sustainability/auth` | Oturum / tenant stub (Faz 1’de IdP) |

### Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Web geliştirme sunucusu |
| `pnpm typecheck` | Tip kontrolü |
| `pnpm lint` | Lint |
| `pnpm build` | Üretim derlemesi |
| `pnpm db:migrate` | Geliştirme migrasyonu |
| `pnpm db:migrate:deploy` | CI / prod migrasyon |

### Faz 0 durumu

Tamamlanan: repo iskeleti, CI, şema (`tenant_id` domain tablolarında), migrasyon, auth stub, health/ready.

Sonraki (Faz 1): gerçek IdP, roller, org ağacı, negatif tenant izolasyon testi, PostgreSQL RLS.

---

## English

### Requirements

- Node.js 20+
- [pnpm](https://pnpm.io) 10+
- Docker (for PostgreSQL)

### Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

App: [http://localhost:3000](http://localhost:3000)

- Liveness: `GET /api/health`
- Readiness (DB): `GET /api/ready`

### Monorepo layout

| Path | Package | Description |
|---|---|---|
| `apps/web` | `@sustainability/web` | Next.js App Router |
| `packages/db` | `@sustainability/db` | Prisma + PostgreSQL |
| `packages/auth` | `@sustainability/auth` | Session / tenant stub (IdP in Phase 1) |

### Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Web dev server |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm lint` | Lint |
| `pnpm build` | Production build |
| `pnpm db:migrate` | Dev migration |
| `pnpm db:migrate:deploy` | CI / prod migrate |

### Phase 0 status

Done: repo skeleton, CI, schema (`tenant_id` on domain tables), migration pipeline, auth stub, health/ready.

Next (Phase 1): real IdP, roles, org tree, negative tenant isolation test, PostgreSQL RLS.
