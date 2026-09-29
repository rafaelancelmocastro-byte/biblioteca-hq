import React from "react";
import { BrandLogo } from "../../components/ui/BrandLogo";

const CHECKOUT_URL =
  "https://lastlink.com/p/C95A90981/checkout-payment/?utm_source=bibliotecahq&utm_medium=site&utm_campaign=acesso_vitalicio";

type Props = {
  hasAccess?: boolean;
  onLogin: () => void;
  onOpenLibrary: () => void;
};

export const SalesPage: React.FC<Props> = ({ hasAccess = false, onLogin, onOpenLibrary }) => {
  const checkout = () => {
    window.location.assign(CHECKOUT_URL);
  };

  return (
    <div className="sales-stage-one">
      <header className="sales-stage-one__header">
        <div className="sales-stage-one__brand">
          <BrandLogo />
          <div className="sales-stage-one__categories" aria-label="Categorias">
            <span>Mangás</span>
            <i />
            <span>Quadrinhos</span>
            <i />
            <span>Sagas</span>
            <i />
            <span>Graphic Novels</span>
          </div>
        </div>

        <button
          className="sales-stage-one__access"
          type="button"
          onClick={hasAccess ? onOpenLibrary : onLogin}
        >
          {hasAccess ? "Abrir biblioteca" : "Já tenho acesso"}
        </button>
      </header>

      <main className="sales-stage-one__hero">
        <section className="sales-stage-one__copy">
          <h1>
            Seu universo de quadrinhos, organizado para você
            <strong> realmente ler.</strong>
          </h1>

          <p>
            Mangás, quadrinhos, sagas e graphic novels em um só lugar. Descubra, explore,
            organize e continue de onde parou, com uma experiência feita por quem ama HQs.
          </p>

          <div className="sales-stage-one__price">
            <span className="sales-stage-one__old-price">R$ 29,99</span>
            <span className="sales-stage-one__current-price">R$ 19,99</span>
          </div>

          <div className="sales-stage-one__actions">
            <button
              className="sales-stage-one__primary"
              type="button"
              onClick={hasAccess ? onOpenLibrary : checkout}
            >
              <span className="sales-stage-one__play">▶</span>
              {hasAccess ? "Abrir minha biblioteca" : "Quero acessar agora"}
            </button>

            <button
              className="sales-stage-one__secondary"
              type="button"
              onClick={onLogin}
            >
              Já tenho acesso
            </button>
          </div>

          <div className="sales-stage-one__trust">
            <div>
              <b>∞</b>
              <span>Pagamento único</span>
            </div>
            <div>
              <b>◇</b>
              <span>Checkout seguro<br />pela Lastlink</span>
            </div>
            <div>
              <b>ϟ</b>
              <span>Conta liberada após<br />pagamento confirmado</span>
            </div>
          </div>
        </section>

        <section className="sales-stage-one__devices" aria-label="Telas reais da Biblioteca HQ">
          <div className="sales-stage-one__glow" aria-hidden="true" />

          <div className="sales-stage-one__phone sales-stage-one__phone--front">
            <div className="sales-stage-one__phone-shell">
              <span className="sales-stage-one__dynamic-island" />
              <img
                src="/sales/continue-reading.webp"
                alt="Biblioteca HQ em Continuar lendo"
                loading="eager"
              />
            </div>
          </div>

          <div className="sales-stage-one__phone sales-stage-one__phone--back">
            <div className="sales-stage-one__phone-shell">
              <span className="sales-stage-one__dynamic-island" />
              <img
                src="/sales/manga-indie.webp"
                alt="Biblioteca HQ em Mangá e Indie"
                loading="eager"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
