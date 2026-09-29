import React, { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Cloud,
  Download,
  Infinity,
  Layers3,
  MonitorSmartphone,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  ZoomIn,
} from "lucide-react";
import { CoverFlow } from "../../components/library/CoverFlow";
import { SalesReaderDemo } from "./SalesReaderDemo";

const CHECKOUT_URL =
  "https://lastlink.com/p/C95A90981/checkout-payment/?utm_source=bibliotecahq&utm_medium=site&utm_campaign=acesso_vitalicio";

const ASSETS = {
  continueReading: "/sales/continue-reading.webp",
  mangaIndie: "/sales/manga-indie.webp",
  collections: "/sales/collections.webp",
};

const collectionCards = [
  { id: "x-men", title: "X-Men", subtitle: "Marvel", image: "/saga-art/x-men.png" },
  { id: "batman", title: "Batman", subtitle: "DC Comics", image: "/saga-art/batman.png" },
  { id: "superman", title: "Superman", subtitle: "DC Comics", image: "/saga-art/superman.png" },
  { id: "green-lantern", title: "Lanterna Verde", subtitle: "DC Comics", image: "/saga-art/green-lantern.png" },
];

const benefits = [
  { icon: Infinity, title: "Acesso vitalício", copy: "Pagamento único, sem mensalidade recorrente nesta oferta." },
  { icon: MonitorSmartphone, title: "Leia onde quiser", copy: "Celular, tablet e computador com a mesma conta." },
  { icon: Layers3, title: "Coleções organizadas", copy: "Editoras, sagas, fases e edições em ordem cronológica." },
  { icon: Cloud, title: "Continue de onde parou", copy: "Progresso sincronizado entre seus dispositivos." },
  { icon: Download, title: "Leitura offline", copy: "Baixe no dispositivo e continue mesmo sem conexão." },
  { icon: ZoomIn, title: "Leitor confortável", copy: "Zoom, ajuste de página e controles pensados para leitura." },
];

type Props = {
  hasAccess?: boolean;
  onLogin: () => void;
  onOpenLibrary: () => void;
};

export const SalesPage: React.FC<Props> = ({ hasAccess = false, onLogin, onOpenLibrary }) => {
  const [collectionIndex, setCollectionIndex] = useState(0);
  const [readerDemoOpen, setReaderDemoOpen] = useState(false);

  const primaryAction = () => {
    if (hasAccess) onOpenLibrary();
    else window.location.assign(CHECKOUT_URL);
  };

  if (readerDemoOpen) {
    return <SalesReaderDemo onClose={() => setReaderDemoOpen(false)} />;
  }

  return (
    <div className="sales-v4">
      <div className="sales-v4__pattern" aria-hidden="true" />

      <header className="sales-v4__header">
        <a href="#top" className="sales-v4__brand" aria-label="Biblioteca HQ">
          <img src="/brand-icon.svg" alt="" />
          <span>
            Biblioteca <strong>HQ</strong>
            <small>Mangás · quadrinhos · sagas · graphic novels</small>
          </span>
        </a>

        <nav aria-label="Navegação da apresentação">
          <a href="#por-dentro">Por dentro</a>
          <a href="#leitor">Teste o leitor</a>
          <a href="#beneficios">Benefícios</a>
          <a href="#acesso">Acesso</a>
        </nav>

        <button type="button" onClick={hasAccess ? onOpenLibrary : onLogin}>
          {hasAccess ? "Abrir biblioteca" : "Já tenho acesso"}
        </button>
      </header>

      <main id="top">
        <section className="sales-v4__hero">
          <div className="sales-v4__hero-copy">
            <span className="sales-v4__eyebrow"><Sparkles /> Biblioteca HQ</span>
            <h1>Seu universo de quadrinhos, organizado para você <em>realmente ler.</em></h1>
            <p>
              Encontre séries, acompanhe sagas, leia no seu ritmo e continue exatamente de onde parou
              em uma experiência feita para quem realmente gosta de HQs.
            </p>

            <div className="sales-v4__price">
              <span>Pagamento único</span>
              <strong><small>R$</small> 19,99</strong>
              <b>Acesso vitalício</b>
            </div>

            <div className="sales-v4__hero-actions">
              <button type="button" className="sales-v4__primary" onClick={primaryAction}>
                <Play />
                {hasAccess ? "Abrir minha biblioteca" : "Quero acessar agora"}
              </button>
              {!hasAccess && (
                <button type="button" className="sales-v4__secondary" onClick={onLogin}>
                  Já tenho acesso
                </button>
              )}
            </div>

            <div className="sales-v4__trust">
              <span><Infinity /> Pagamento único</span>
              <span><ShieldCheck /> Checkout seguro</span>
              <span><Check /> Liberação após confirmação</span>
            </div>
          </div>

          <div className="sales-v4__hero-devices" aria-label="Telas reais da Biblioteca HQ">
            <div className="sales-v4__phone sales-v4__phone--left">
              <span className="sales-v4__island" />
              <img src={ASSETS.continueReading} alt="Tela real Continuar lendo" loading="eager" />
            </div>
            <div className="sales-v4__phone sales-v4__phone--right">
              <span className="sales-v4__island" />
              <img src={ASSETS.mangaIndie} alt="Tela real Mangá e Indie" loading="eager" />
            </div>
          </div>
        </section>

        <section className="sales-v4__inside" id="por-dentro">
          <div className="sales-v4__section-heading">
            <span>VEJA POR DENTRO DO APP</span>
            <h2>A interface que você vai usar de verdade.</h2>
            <p>Mockups montados com capturas reais do próprio sistema, sem telas genéricas.</p>
          </div>

          <div className="sales-v4__inside-grid">
            <article className="sales-v4__video-card">
              <div className="sales-v4__video-preview">
                <img src={ASSETS.continueReading} alt="Prévia real do aplicativo" />
                <div className="sales-v4__video-shade" />
                <button type="button" aria-label="Espaço reservado para vídeo demonstrativo">
                  <Play />
                </button>
              </div>
              <div>
                <strong>Vídeo explicando o sistema por dentro</strong>
                <span>Espaço pronto para receber seu vídeo demonstrativo.</span>
              </div>
            </article>

            <div className="sales-v4__real-screens">
              {[
                [ASSETS.continueReading, "Continuar lendo", "Retome exatamente de onde parou"],
                [ASSETS.mangaIndie, "Mangá & Indie", "Descubra títulos e coleções"],
                [ASSETS.collections, "Coleções & sagas", "Navegue pela organização do acervo"],
              ].map(([src, title, copy]) => (
                <article key={title}>
                  <div className="sales-v4__mini-phone"><img src={src} alt={title} loading="lazy" /></div>
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sales-v4__reader-experience" id="leitor">
          <div className="sales-v4__reader-copy">
            <span>EXPERIMENTE ANTES DE ENTRAR</span>
            <h2>Leia algumas páginas e sinta o leitor na prática.</h2>
            <p>
              Abra uma demonstração pública com 5 páginas, navegue por swipe ou teclado e teste
              zoom e ajuste de página. É uma amostra isolada: não exige login e não altera seu progresso.
            </p>
            <div className="sales-v4__reader-badges">
              <span><ZoomIn /> Zoom 100–180%</span>
              <span><BookOpen /> Ajuste de página</span>
              <span><MonitorSmartphone /> Swipe e teclado</span>
            </div>
            <button type="button" className="sales-v4__primary" onClick={() => setReaderDemoOpen(true)}>
              <BookOpen /> Testar o leitor agora
            </button>
          </div>
          <button type="button" className="sales-v4__reader-card" onClick={() => setReaderDemoOpen(true)}>
            <img src={ASSETS.mangaIndie} alt="Abrir demonstração do leitor" />
            <span className="sales-v4__reader-card-play"><Play /></span>
            <strong>Demonstração de leitura</strong>
            <small>5 páginas · experiência interativa</small>
          </button>
        </section>

        <section className="sales-v4__collections">
          <div className="sales-v4__section-heading">
            <span>EXPLORE COLEÇÕES</span>
            <h2>O mesmo CoverFlow usado dentro do app.</h2>
            <p>Uma pequena amostra automática para mostrar como o acervo é apresentado.</p>
          </div>

          <div className="sales-v4__coverflow-shell">
            <CoverFlow
              items={collectionCards}
              activeIndex={collectionIndex}
              onChange={setCollectionIndex}
              label="Coleções em destaque"
              autoPlayMs={3600}
            />
            <div className="sales-v4__coverflow-meta">
              <small>COLEÇÃO EM DESTAQUE</small>
              <strong>{collectionCards[collectionIndex]?.title}</strong>
              <span>{collectionCards[collectionIndex]?.subtitle}</span>
            </div>
          </div>
        </section>

        <section className="sales-v4__benefits" id="beneficios">
          <div className="sales-v4__section-heading">
            <span>POR QUE BIBLIOTECA HQ?</span>
            <h2>Feita para ler, não apenas armazenar arquivos.</h2>
          </div>

          <div className="sales-v4__benefit-grid">
            {benefits.map(({ icon: Icon, title, copy }) => (
              <article key={title}>
                <Icon />
                <strong>{title}</strong>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sales-v4__guarantee">
          <div className="sales-v4__guarantee-seal">
            <ShieldCheck />
            <strong>7</strong>
            <span>DIAS</span>
          </div>
          <div>
            <span>GARANTIA DE 7 DIAS</span>
            <h2>Entre, teste e conheça com tranquilidade.</h2>
            <p>
              Você conta com 7 dias de garantia após a compra. Em caso de reembolso confirmado,
              o acesso vitalício é revogado automaticamente.
            </p>
          </div>
          <ul>
            <li><Check /> Pagamento processado pela Lastlink</li>
            <li><Check /> Liberação automática após confirmação</li>
            <li><Check /> Reembolso com revogação automática do acesso</li>
          </ul>
        </section>

        <section className="sales-v4__final" id="acesso">
          <div>
            <span>ACESSO VITALÍCIO</span>
            <h2>Comece hoje sua jornada no mundo dos HQs.</h2>
            <p>Pagamento único, acesso em vários dispositivos e toda a experiência da Biblioteca HQ.</p>
          </div>
          <div className="sales-v4__final-price">
            <small>Pagamento único</small>
            <strong><sup>R$</sup> 19,99</strong>
            <button type="button" className="sales-v4__primary" onClick={primaryAction}>
              <ArrowRight /> {hasAccess ? "Abrir minha biblioteca" : "Garantir acesso agora"}
            </button>
            <span><ShieldCheck /> Checkout seguro pela Lastlink</span>
          </div>
        </section>
      </main>
    </div>
  );
};
