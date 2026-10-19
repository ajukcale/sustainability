"use client";

import Link from "next/link";
import { useState } from "react";

type ImportResult = {
  dryRun?: boolean;
  validRows?: number;
  errorRows?: number;
  errors?: { row: number; message: string }[];
  importJob?: {
    id: string;
    status: string;
    importedRows: number;
    errorRows: number;
    errors?: { row: number; message: string }[];
  };
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockPeriod, setLockPeriod] = useState("2026-01");

  async function run(dryRun: boolean) {
    if (!file) {
      setError("CSV dosyası seçin");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    if (dryRun) fd.append("dryRun", "true");
    const res = await fetch("/api/activity-data/import", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "İçe aktarma başarısız");
      return;
    }
    setResult(data);
  }

  async function lock() {
    const res = await fetch("/api/periods/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodKey: lockPeriod, reason: "Demo dönem kilidi" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Kilit başarısız");
      return;
    }
    setError(null);
    alert(`Dönem kilitlendi: ${lockPeriod}`);
  }

  return (
    <section className="stack">
      <div className="panel stack">
        <h2>CSV içe aktarma</h2>
        <p className="muted">
          Ön doğrulama (dry-run) sonra kontrollü aktarım.{" "}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              window.location.href = "/api/activity-data/template";
            }}
          >
            Şablonu indir
          </button>{" "}
          · <Link href="/panel/veri">Veri listesine dön</Link>
        </p>
        {error ? <p className="error">{error}</p> : null}
        <label>
          CSV dosyası
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="nav">
          <button type="button" className="secondary" onClick={() => run(true)}>
            Ön doğrula
          </button>
          <button type="button" onClick={() => run(false)}>
            İçe aktar
          </button>
        </div>
        {result ? (
          <div className="stack">
            <p>
              Geçerli: {result.validRows ?? result.importJob?.importedRows} · Hata:{" "}
              {result.errorRows ?? result.importJob?.errorRows}{" "}
              {result.dryRun ? "(ön doğrulama)" : ""}
            </p>
            {(result.errors ?? result.importJob?.errors)?.length ? (
              <ul>
                {(result.errors ?? result.importJob?.errors)?.map((e, i) => (
                  <li key={i}>
                    Satır {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Hata yok.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="panel stack">
        <h3>Dönem kilidi</h3>
        <label>
          Dönem
          <input
            value={lockPeriod}
            onChange={(e) => setLockPeriod(e.target.value)}
            pattern="\d{4}-\d{2}"
          />
        </label>
        <button type="button" onClick={lock}>
          Dönemi kilitle
        </button>
      </div>
    </section>
  );
}
