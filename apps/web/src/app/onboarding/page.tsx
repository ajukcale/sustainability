"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Firma oluşturulamadı");
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  return (
    <main className="shell">
      <h1 className="brand">Sürdürülebilirlik</h1>
      <p className="lede">Firmanızı oluşturun (tenant onboarding).</p>
      <form className="panel stack" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
        <label>
          Firma adı
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Kısa kod (slug, isteğe bağlı)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ornek-as"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Oluşturuluyor…" : "Firmayı oluştur"}
        </button>
      </form>
    </main>
  );
}
