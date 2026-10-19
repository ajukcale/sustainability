"use client";

import { useEffect, useState } from "react";

export default function PanelHome() {
  const [me, setMe] = useState<{
    membership: { roleName: string; permissions: string[] } | null;
    activeTenantId: string | null;
    mfaRequired: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => undefined);
  }, []);

  return (
    <section className="panel stack">
      <h2>Panel</h2>
      <p className="muted">
        Phase 1: kimlik, roller, davet ve organizasyon ağacı. Veri girişi ve emisyon
        hesapları sonraki fazlarda.
      </p>
      {me?.membership ? (
        <p>
          Rol: <strong>{me.membership.roleName}</strong>
          <br />
          <span className="muted">
            İzinler: {me.membership.permissions.join(", ") || "—"}
          </span>
        </p>
      ) : (
        <p className="muted">Aktif üyelik yok — onboarding veya davet gerekli.</p>
      )}
      <p className="muted">
        MFA: {me?.mfaRequired ? "zorunlu (yapılandırma)" : "kapalı (AUTH_MFA_REQUIRED)"}
      </p>
    </section>
  );
}
