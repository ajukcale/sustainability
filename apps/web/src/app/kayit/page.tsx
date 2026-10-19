"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "@sustainability/auth/client";

export default function KayitPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signUp.email({ name, email, password });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Kayıt başarısız");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="shell">
      <h1 className="brand">Sürdürülebilirlik</h1>
      <p className="lede">Yeni hesap oluşturun, ardından firmanızı tanımlayın.</p>
      <form className="panel stack" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
        <label>
          Ad soyad
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          E-posta
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
        <button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor…" : "Kayıt ol"}
        </button>
        <p className="muted">
          Zaten hesabınız var mı? <Link href="/giris">Giriş yapın</Link>
        </p>
      </form>
    </main>
  );
}
