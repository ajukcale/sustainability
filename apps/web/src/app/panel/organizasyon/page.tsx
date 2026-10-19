"use client";

import { useCallback, useEffect, useState } from "react";

type OrgUnit = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  isActive: boolean;
  previousName: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  company: "Şirket",
  facility: "Tesis",
  line: "Hat",
  unit: "Birim",
};

export default function OrganizasyonPage() {
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"facility" | "line" | "unit">("facility");
  const [parentId, setParentId] = useState("");

  const load = useCallback(() => {
    fetch("/api/org-units")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Yüklenemedi");
        setUnits(data.orgUnits);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createUnit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/org-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        parentId: parentId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Oluşturulamadı");
      return;
    }
    setName("");
    load();
  }

  async function toggleActive(unit: OrgUnit) {
    const res = await fetch(`/api/org-units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !unit.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi");
      return;
    }
    load();
  }

  return (
    <section className="stack">
      <div className="panel stack">
        <h2>Organizasyon ağacı</h2>
        <p className="muted">Şirket → Tesis → Hat / Birim. Pasif birimler geçmişi korur.</p>
        {error ? <p className="error">{error}</p> : null}
        <div>
          {units.map((u) => (
            <div key={u.id} className="tree-item">
              <span className="badge">{TYPE_LABEL[u.type] ?? u.type}</span>
              <strong>{u.name}</strong>
              {u.previousName ? (
                <span className="muted">(önceki: {u.previousName})</span>
              ) : null}
              <span className={u.isActive ? "badge" : "badge off"}>
                {u.isActive ? "Aktif" : "Pasif"}
              </span>
              <button type="button" className="secondary" onClick={() => toggleActive(u)}>
                {u.isActive ? "Pasifleştir" : "Aktifleştir"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <form className="panel stack" onSubmit={createUnit}>
        <h3>Yeni birim</h3>
        <label>
          Ad
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Tip
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "facility" | "line" | "unit")}
          >
            <option value="facility">Tesis</option>
            <option value="line">Hat</option>
            <option value="unit">Birim</option>
          </select>
        </label>
        <label>
          Üst birim
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} required>
            <option value="">Seçin</option>
            {units
              .filter((u) => u.isActive)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {TYPE_LABEL[u.type]} — {u.name}
                </option>
              ))}
          </select>
        </label>
        <button type="submit">Ekle</button>
      </form>
    </section>
  );
}
