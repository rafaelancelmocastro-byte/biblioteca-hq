import React from "react";
import { BrandLogo } from "../../components/ui/BrandLogo";

const MANGA_INDIE_SCREENSHOT = "data:image/webp;base64,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";

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
        </div>

        <nav className="sales-stage-one__categories" aria-label="Categorias">
          <span>Mangás</span>
          <i />
          <span>Quadrinhos</span>
          <i />
          <span>Sagas</span>
          <i />
          <span>Graphic Novels</span>
        </nav>

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

          <div className="sales-stage-one__price" aria-label="Preço promocional">
            <span className="sales-stage-one__old-price"><small>De</small> R$ 29,99</span>
            <span className="sales-stage-one__current-price"><small>Por apenas</small> R$ 19,99</span>
          </div>

          <div className="sales-stage-one__actions">
            <button
              className="sales-stage-one__primary"
              type="button"
              onClick={hasAccess ? onOpenLibrary : checkout}
            >
              <span className="sales-stage-one__play" aria-hidden="true">→</span>
              {hasAccess ? "Abrir minha biblioteca" : "Garantir acesso imediato"}
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
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 8.5c-2.2 0-4 1.6-4 3.5s1.8 3.5 4 3.5c1.8 0 3.1-.9 4.5-3.5 1.4-2.6 2.7-3.5 4.5-3.5 2.2 0 4 1.6 4 3.5s-1.8 3.5-4 3.5c-1.8 0-3.1-.9-4.5-3.5-1.4-2.6-2.7-3.5-4.5-3.5Z"/></svg>
              <span>Pagamento único</span>
            </div>
            <div>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 3 8.1 7 10 4-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.6 1.6 3.7-4"/></svg>
              <span>Checkout seguro pela Lastlink</span>
            </div>
            <div>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 5 13h6l-1 9 9-13h-6l0-7Z"/></svg>
              <span>Liberação após pagamento</span>
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
                src={MANGA_INDIE_SCREENSHOT}
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
