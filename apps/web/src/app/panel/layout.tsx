"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@sustainability/auth/client";

type Me = {
  user: { name: string; email: string };
  activeTenantId: string | null;
  membership: { roleName: string } | null;
  memberships: { tenantId: string; tenantName: string }[];
};

export default function PanelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/giris");
          return null;
        }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Oturum alınamadı");
        if (!data.activeTenantId && data.memberships?.length === 0) {
          router.replace("/onboarding");
          return null;
        }
        setMe(data);
        return data;
      })
      .catch((e: Error) => setError(e.message));
  }, [router, pathname]);

  async function switchTenant(tenantId: string) {
    await fetch("/api/tenants/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    router.refresh();
    window.location.reload();
  }

  return (
    <main className="shell">
      <h1 className="brand">Sürdürülebilirlik</h1>
      {me ? (
        <p className="muted">
          {me.user.name} · {me.user.email}
          {me.membership ? ` · ${me.membership.roleName}` : ""}
        </p>
      ) : null}
      <nav className="nav">
        <Link href="/panel">Özet</Link>
        <Link href="/panel/veri">Veri</Link>
        <Link href="/panel/organizasyon">Organizasyon</Link>
        <Link href="/panel/kullanicilar">Kullanıcılar</Link>
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            await signOut();
            router.push("/giris");
          }}
        >
          Çıkış
        </button>
      </nav>
      {me && me.memberships.length > 1 ? (
        <label style={{ marginBottom: "1rem", maxWidth: 320 }}>
          Aktif firma
          <select
            value={me.activeTenantId ?? ""}
            onChange={(e) => switchTenant(e.target.value)}
          >
            {me.memberships.map((m) => (
              <option key={m.tenantId} value={m.tenantId}>
                {m.tenantName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {children}
    </main>
  );
}
