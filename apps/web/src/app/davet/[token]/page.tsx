"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DavetPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<{
    email: string;
    tenantName: string;
    roleName: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Davet geçersiz");
        setInfo(data);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Davet kabul edilemedi");
      return;
    }
    router.push("/giris");
  }

  return (
    <main className="shell">
      <h1 className="brand">Sürdürülebilirlik</h1>
      <p className="lede">Daveti kabul edin ve hesabınızı etkinleştirin.</p>
      {info ? (
        <p className="muted">
          <strong>{info.tenantName}</strong> — {info.roleName} · {info.email}
        </p>
      ) : null}
      <form className="panel stack" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
        <label>
          Ad soyad
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Parola
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={loading || !info}>
          {loading ? "Kaydediliyor…" : "Daveti kabul et"}
        </button>
        <p className="muted">
          Zaten hesabınız varsa kabul sonrası <Link href="/giris">giriş yapın</Link>.
        </p>
      </form>
    </main>
  );
}
