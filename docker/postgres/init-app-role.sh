#!/bin/bash
set -euo pipefail
# Official postgres image makes POSTGRES_USER a superuser (bypasses RLS).
# Demote for app use so FORCE ROW LEVEL SECURITY is effective.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  ALTER ROLE ${POSTGRES_USER} NOSUPERUSER NOBYPASSRLS;
EOSQL
