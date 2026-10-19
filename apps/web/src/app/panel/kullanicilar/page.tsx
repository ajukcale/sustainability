"use client";

import { useCallback, useEffect, useState } from "react";

type Role = { id: string; key: string; name: string };
type UserRow = {
  userId: string;
  email: string;
  name: string;
  status: string;
  roleId: string;
  roleName: string;
};
type Invite = {
  id: string;
  email: string;
  role: { name: string };
  expiresAt: string;
};

export default function KullanicilarPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/invites").then((r) => r.json()),
    ])
      .then(([u, r, i]) => {
        if (u.error || r.error || i.error) {
          setError(u.error || r.error || i.error);
          return;
        }
        setUsers(u.users);
        setRoles(r.roles);
        setInvites(i.invites);
        if (!roleId && r.roles?.[0]) setRoleId(r.roles[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, [roleId]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAcceptUrl(null);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, roleId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Davet gönderilemedi");
      return;
    }
    setAcceptUrl(data.acceptUrl);
    setEmail("");
    load();
  }

  async function changeRole(userId: string, nextRoleId: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: nextRoleId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Rol güncellenemedi");
      return;
    }
    load();
  }

  return (
    <section className="stack">
      <div className="panel stack">
        <h2>Kullanıcılar ve roller</h2>
        {error ? <p className="error">{error}</p> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>E-posta</th>
              <th>Rol</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.roleId}
                    onChange={(e) => changeRole(u.userId, e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="panel stack" onSubmit={invite}>
        <h3>Kullanıcı davet et</h3>
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
          Rol
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Davet oluştur</button>
        {acceptUrl ? (
          <p className="muted">
            SMTP yok — davet bağlantısı (günlüğe de yazıldı):{" "}
            <a href={acceptUrl}>{acceptUrl}</a>
          </p>
        ) : null}
      </form>

      <div className="panel stack">
        <h3>Bekleyen davetler</h3>
        {invites.length === 0 ? (
          <p className="muted">Bekleyen davet yok.</p>
        ) : (
          <ul>
            {invites.map((i) => (
              <li key={i.id}>
                {i.email} — {i.role.name} (son:{" "}
                {new Date(i.expiresAt).toLocaleString("tr-TR")})
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
