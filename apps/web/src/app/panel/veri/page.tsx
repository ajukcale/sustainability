"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type OrgUnit = { id: string; name: string; type: string };
type Activity = {
  id: string;
  category: string;
  periodKey: string;
  quantity: string | number;
  unit: string;
  status: string;
  source: string;
  revision: number;
  orgUnit: { id: string; name: string };
  evidence: { id: string; fileName: string }[];
};

const CATEGORY_LABEL: Record<string, string> = {
  energy: "Enerji",
  water: "Su",
  material: "Hammadde",
  production: "Üretim",
  logistics: "Lojistik",
  waste: "Atık",
};

const NEXT_STATUS: Record<string, string | null> = {
  draft: "validated",
  validated: "approved",
  approved: "locked",
  locked: null,
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  validated: "Doğrulandı",
  approved: "Onaylandı",
  locked: "Kilitli",
  validated_btn: "Doğrula",
  approved_btn: "Onayla",
  locked_btn: "Kilitle",
};

export default function VeriPage() {
  const [rows, setRows] = useState<Activity[]>([]);
  const [orgs, setOrgs] = useState<OrgUnit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orgUnitId, setOrgUnitId] = useState("");
  const [category, setCategory] = useState("energy");
  const [periodKey, setPeriodKey] = useState("2026-01");
  const [quantity, setQuantity] = useState("1000");
  const [unit, setUnit] = useState("kWh");

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/activity-data").then((r) => r.json()),
      fetch("/api/org-units").then((r) => r.json()),
    ])
      .then(([a, o]) => {
        if (a.error || o.error) {
          setError(a.error || o.error);
          return;
        }
        setRows(a.activityData);
        setOrgs(o.orgUnits ?? []);
        if (!orgUnitId && o.orgUnits?.[0]) setOrgUnitId(o.orgUnits[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, [orgUnitId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createManual(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/activity-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgUnitId,
        category,
        periodKey,
        quantity: Number(quantity),
        unit,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Kayıt oluşturulamadı");
      return;
    }
    load();
  }

  async function advance(row: Activity) {
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    const res = await fetch(`/api/activity-data/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Durum güncellenemedi");
      return;
    }
    load();
  }

  async function uploadEvidence(rowId: string, file: File | null) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/activity-data/${rowId}/evidence`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Kanıt yüklenemedi");
      return;
    }
    load();
  }

  return (
    <section className="stack">
      <div className="panel stack">
        <h2>Operasyonel veri</h2>
        <p className="muted">
          Manuel giriş ve yaşam döngüsü: taslak → doğrula → onayla → kilitle.{" "}
          <Link href="/panel/veri/import">CSV içe aktar</Link>
        </p>
        {error ? <p className="error">{error}</p> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Dönem</th>
              <th>Kategori</th>
              <th>Birim</th>
              <th>Miktar</th>
              <th>Durum</th>
              <th>Kanıt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.periodKey}</td>
                <td>{CATEGORY_LABEL[r.category] ?? r.category}</td>
                <td>{r.orgUnit.name}</td>
                <td>
                  {String(r.quantity)} {r.unit}
                </td>
                <td>
                  <span className="badge">
                    {STATUS_LABEL[r.status] ?? r.status} · r{r.revision}
                  </span>
                </td>
                <td>
                  {r.evidence?.length ? (
                    r.evidence.map((e) => e.fileName).join(", ")
                  ) : (
                    <input
                      type="file"
                      onChange={(ev) =>
                        uploadEvidence(r.id, ev.target.files?.[0] ?? null)
                      }
                    />
                  )}
                </td>
                <td>
                  {NEXT_STATUS[r.status] ? (
                    <button type="button" className="secondary" onClick={() => advance(r)}>
                      {STATUS_LABEL[`${NEXT_STATUS[r.status]}_btn`] ??
                        NEXT_STATUS[r.status]}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="panel stack" onSubmit={createManual}>
        <h3>Manuel enerji / kategori kaydı</h3>
        <label>
          Org birimi
          <select
            value={orgUnitId}
            onChange={(e) => setOrgUnitId(e.target.value)}
            required
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.type} — {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kategori
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dönem (YYYY-MM)
          <input
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            required
            pattern="\d{4}-\d{2}"
          />
        </label>
        <label>
          Miktar
          <input
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>
        <label>
          Birim
          <input value={unit} onChange={(e) => setUnit(e.target.value)} required />
        </label>
        <button type="submit">Taslak olarak kaydet</button>
      </form>
    </section>
  );
}
