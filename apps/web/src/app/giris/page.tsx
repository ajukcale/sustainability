"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@sustainability/auth/client";

export default function GirisPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn.email({ email, password });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Giriş başarısız");
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  return (
    <main className="shell">
      <h1 className="brand">Sürdürülebilirlik</h1>
      <p className="lede">Hesabınıza giriş yapın.</p>
      <form className="panel stack" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
        <label>
          E-posta
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Parola
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
        <p className="muted">
          Hesabınız yok mu? <Link href="/kayit">Kayıt olun</Link>
        </p>
      </form>
    </main>
  );
}
