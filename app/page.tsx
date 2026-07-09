import GuestApp from "@/components/GuestApp";

export default function HomePage() {
  return (
    <>
      <div className="hero">
        <div className="save-date">Save The Date · 19.09.2026</div>
        <h1 className="names">
          Marcia <span className="amp">&amp;</span> Matheus
        </h1>
        <div className="eyebrow">Vão se casar</div>
        <p className="subtitle">Lista de presentes</p>
        <div className="divider" />
        <p className="intro">
          A presença de vocês já é o nosso maior presente. Mas, se quiserem nos ajudar a começar essa nova fase,
          preparamos esta lista com carinho. Basta escolher um item, avisar que é seu, e deixar o resto com a gente.
        </p>
      </div>

      <GuestApp />

      <footer>
        <div>Feito com carinho para o grande dia de Marcia &amp; Matheus.</div>
        <div style={{ marginTop: 10 }}>
          <a className="admin-link" href="/admin">
            Área da noiva
          </a>
        </div>
      </footer>
    </>
  );
}
