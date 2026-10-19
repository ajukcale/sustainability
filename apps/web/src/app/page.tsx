import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <p className="brand">Sürdürülebilirlik</p>
      <p className="lede">
        Kurumsal karbon ayak izi ve kaynak verimliliği için çok kiracılı platform.
        Phase 1: kimlik, roller ve organizasyon.
      </p>
      <div className="nav">
        <Link className="btn" href="/giris">
          Giriş yap
        </Link>
        <Link className="btn secondary" href="/kayit">
          Kayıt ol
        </Link>
        <Link href="/panel">Panele git</Link>
      </div>
    </main>
  );
}
