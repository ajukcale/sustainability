# Sürdürülebilirlik / Sustainability

Multi-tenant sustainability SaaS (carbon footprint + operational resource efficiency).

**Phase 1:** Better Auth (e-posta/parola), roller, davet, org ağacı, RLS, negatif tenant izolasyon testleri. UI dili varsayılan: Türkçe.

---

## Türkçe

### Gereksinimler

- Node.js 20+
- [pnpm](https://pnpm.io) 10+
- Docker (PostgreSQL için) veya yerel Postgres

### Hızlı başlangıç

```bash
cp .env.example .env
# BETTER_AUTH_SECRET değerini uzun rastgele bir dize yapın
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

Uygulama: [http://localhost:3000](http://localhost:3000)

- Giriş: `/giris` · Kayıt: `/kayit` · Firma onboarding: `/onboarding`
- Panel: `/panel` · Organizasyon · Kullanıcılar / davet
- Canlılık: `GET /api/health` · Hazırlık: `GET /api/ready`

### İzolasyon testleri

```bash
pnpm db:migrate:deploy
pnpm test:isolation
```

### Monorepo

| Yol | Paket | Açıklama |
|---|---|---|
| `apps/web` | `@sustainability/web` | Next.js App Router + TR UI / API |
| `packages/db` | `@sustainability/db` | Prisma, roller, RLS yardımcıları |
| `packages/auth` | `@sustainability/auth` | Better Auth + oturum / RBAC |

---

## English

### Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

### Isolation tests

```bash
pnpm test:isolation
```

Phase 1 adds real login (Better Auth), BRD roles, invites, org tree CRUD, PostgreSQL RLS, and a negative tenant isolation suite.
