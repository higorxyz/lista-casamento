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
          Sua presença em nosso casamento é o que torna esse momento especial. Se desejar nos presentear, preparamos uma lista com sugestões para facilitar sua escolha. Para evitar presentes repetidos, pedimos que, ao escolher um item, informe seu nome e telefone. Em cada presente, também disponibilizamos um link com uma sugestão de compra. Se preferir enviar o presente diretamente para nossa casa, entre em contato conosco para receber nosso endereço.

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
