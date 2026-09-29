import React, { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Cloud,
  Download,
  Layers3,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  ZoomIn,
} from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { CoverFlow } from "../../components/library/CoverFlow";

const CHECKOUT_URL =
  "https://lastlink.com/p/C95A90981/checkout-payment/?utm_source=bibliotecahq&utm_medium=site&utm_campaign=acesso_vitalicio";

type Props = {
  hasAccess?: boolean;
  onLogin: () => void;
  onOpenLibrary: () => void;
};

const showcaseCollections = [
  { id: "x-men", title: "X-Men", subtitle: "Marvel", image: "/saga-art/x-men.png" },
  { id: "batman", title: "Batman", subtitle: "DC Comics", image: "/saga-art/batman.png" },
  { id: "superman", title: "Superman", subtitle: "DC Comics", image: "/saga-art/superman.png" },
  { id: "green-lantern", title: "Lanterna Verde", subtitle: "DC Comics", image: "/saga-art/green-lantern.png" },
];

const features = [
  {
    icon: Layers3,
    title: "Coleções organizadas",
    copy: "Editoras, coleções, sagas, fases e edições em uma navegação feita para quadrinhos.",
  },
  {
    icon: Download,
    title: "Leitura offline",
    copy: "Baixe no dispositivo e continue lendo mesmo sem conexão.",
  },
  {
    icon: Cloud,
    title: "Progresso sincronizado",
    copy: "Continue de onde parou ao alternar entre celular, tablet e computador.",
  },
  {
    icon: ZoomIn,
    title: "Leitor confortável",
    copy: "Zoom, rolagem, página única ou dupla e controles adaptados a telas menores.",
  },
  {
    icon: Search,
    title: "Busca rápida",
    copy: "Encontre séries, anos, personagens e edições sem se perder no acervo.",
  },
  {
    icon: BookOpen,
    title: "Feita para leitura",
    copy: "Favoritos, continuar lendo, lançamentos e guia de leitura no mesmo lugar.",
  },
];

export const SalesPage: React.FC<Props> = ({ hasAccess = false, onLogin, onOpenLibrary }) => {
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const checkout = () => {
    window.location.href = CHECKOUT_URL;
  };

  return (
    <div className="sales-page sales-page-v2">
      <header className="sales-header">
        <BrandLogo showTagline />
        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#por-dentro">Por dentro</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#acesso">Acesso</a>
          <button type="button" onClick={hasAccess ? onOpenLibrary : onLogin}>
            {hasAccess ? "Abrir biblioteca" : "Entrar"}
          </button>
        </nav>
      </header>

      <main>
        <section className="sales-hero sales-hero-v2">
          <div className="sales-hero-copy">
            <span className="sales-eyebrow">
              <Sparkles /> Biblioteca HQ
            </span>
            <h1>Seu universo de quadrinhos, organizado para você realmente ler.</h1>
            <p>
              Descubra, organize e acompanhe suas leituras em uma experiência feita para HQs,
              mangás, graphic novels, sagas e coleções — no celular, tablet ou computador.
            </p>

            <div className="sales-actions">
              {hasAccess ? (
                <button className="sales-primary sales-primary-accent" type="button" onClick={onOpenLibrary}>
                  Abrir minha biblioteca <ArrowRight />
                </button>
              ) : (
                <button className="sales-primary sales-primary-accent" type="button" onClick={checkout}>
                  Quero acesso vitalício <ArrowRight />
                </button>
              )}
              <button className="sales-secondary" type="button" onClick={onLogin}>
                Já tenho acesso
              </button>
            </div>

            <div className="sales-price-inline">
              <span>Acesso vitalício</span>
              <strong>R$ 19,99</strong>
              <small>pagamento único</small>
            </div>

            <div className="sales-trust">
              <span><Check /> Sem mensalidade</span>
              <span><ShieldCheck /> 7 dias de garantia</span>
              <span><Check /> Checkout seguro pela Lastlink</span>
            </div>
          </div>

          <div className="sales-product-preview sales-product-preview-v2" aria-label="Coleções em destaque">
            <div className="sales-preview-top">
              <span>Coleções em destaque</span>
              <span>rotação automática</span>
            </div>
            <div className="sales-showcase-flow">
              <CoverFlow
                items={showcaseCollections}
                activeIndex={showcaseIndex}
                onChange={setShowcaseIndex}
                label="Coleções da Biblioteca HQ"
                autoPlayMs={3600}
              />
            </div>
            <div className="sales-preview-panel">
              <div>
                <small>EM DESTAQUE</small>
                <strong>{showcaseCollections[showcaseIndex]?.title}</strong>
                <span>{showcaseCollections[showcaseIndex]?.subtitle}</span>
              </div>
              <BookOpen />
            </div>
          </div>
        </section>

        <section className="sales-strip" aria-label="Principais benefícios">
          <span>Mobile</span><i />
          <span>Tablet</span><i />
          <span>Desktop</span><i />
          <span>Offline</span><i />
          <span>Sincronizado</span>
        </section>

        <section className="sales-section" id="recursos">
          <div className="sales-section-heading">
            <span>FEITO PARA QUEM GOSTA DE LER</span>
            <h2>Menos tempo procurando. Mais tempo dentro das histórias.</h2>
            <p>
              O sistema foi construído para transformar um acervo grande em uma biblioteca simples,
              elegante e fácil de continuar usando todos os dias.
            </p>
          </div>

          <div className="sales-feature-grid">
            {features.map(({ icon: Icon, title, copy }) => (
              <article key={title}>
                <Icon />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sales-section sales-inside-section" id="por-dentro">
          <div className="sales-section-heading">
            <span>VEJA O SISTEMA POR DENTRO</span>
            <h2>Uma interface feita para leitura, não para parecer uma pasta de arquivos.</h2>
            <p>
              A experiência mantém a mesma linguagem visual da Biblioteca HQ em todas as telas:
              foco no conteúdo, leitura fluida e navegação direta.
            </p>
          </div>

          <div className="sales-real-ui-grid">
            <article className="sales-ui-shot sales-ui-shot-wide sales-ui-shot-real">
              <div className="sales-shot-frame sales-shot-frame-wide">
                <img
                  src="/sales/continue-reading.webp"
                  alt="Tela real da Biblioteca HQ mostrando a área Continuar lendo e o progresso de leitura"
                  loading="lazy"
                />
              </div>
              <footer>
                <strong>Continue exatamente de onde parou</strong>
                <span>Progresso de leitura claro e sincronizado entre dispositivos.</span>
              </footer>
            </article>

            <article className="sales-ui-shot sales-ui-shot-real">
              <div className="sales-shot-frame">
                <img
                  src="/sales/collections.webp"
                  alt="Tela real da Biblioteca HQ mostrando Coleções e sagas em CoverFlow"
                  loading="lazy"
                />
              </div>
              <footer>
                <strong>Coleções, sagas e editoras</strong>
                <span>O acervo deixa de parecer uma pasta e passa a ter contexto visual.</span>
              </footer>
            </article>

            <article className="sales-ui-shot sales-ui-shot-interface">
              <div className="sales-ui-device">
                <span className="sales-ui-kicker">BIBLIOTECA HQ</span>
                <h3>Feita para qualquer tela</h3>
                <p>O mesmo design system se adapta ao celular, tablet e computador.</p>
                <div className="sales-ui-cover-focus">
                  <img src="/saga-art/x-men.png" alt="" />
                  <img className="active" src="/saga-art/batman.png" alt="" />
                  <img src="/saga-art/superman.png" alt="" />
                </div>
              </div>
              <footer>
                <strong>Experiência consistente</strong>
                <span>Navegação e leitura preservadas em qualquer tamanho de tela.</span>
              </footer>
            </article>
          </div>

          <div className="sales-video-slot">
            <div className="sales-video-placeholder">
              <span className="sales-video-play"><Play /></span>
              <strong>Vídeo: veja como funciona por dentro</strong>
              <small>
                Espaço reservado. Quando o vídeo estiver hospedado, basta conectar o link aqui sem
                alterar o restante da página.
              </small>
            </div>
          </div>
        </section>

        <section className="sales-section sales-flow-section" id="como-funciona">
          <div className="sales-section-heading">
            <span>ACESSO AUTOMÁTICO</span>
            <h2>Comprou, confirmou, entrou.</h2>
            <p>
              Sem comprovante por mensagem e sem liberação manual. A compra confirmada inicia o
              fluxo de acesso automaticamente.
            </p>
          </div>

          <div className="sales-flow">
            <article><b>1</b><h3>Finalize a compra</h3><p>Pagamento no checkout seguro da Lastlink.</p></article>
            <article><b>2</b><h3>Pagamento confirmado</h3><p>A confirmação chega automaticamente ao sistema.</p></article>
            <article><b>3</b><h3>Receba seu convite</h3><p>O convite vai para o e-mail usado na compra.</p></article>
            <article><b>4</b><h3>Crie sua senha</h3><p>Defina sua senha e abra a Biblioteca HQ.</p></article>
          </div>
        </section>

        <section className="sales-offer sales-offer-v2" id="acesso">
          <div className="sales-offer-copy">
            <span>ACESSO VITALÍCIO</span>
            <h2>Uma compra. Sua biblioteca sempre disponível.</h2>
            <p>
              Pagamento único nesta oferta, sem mensalidade. O acesso fica vinculado ao e-mail usado
              no checkout.
            </p>
            <ul>
              <li><Check /> Biblioteca organizada por coleções, sagas e editoras</li>
              <li><Check /> Leitura offline e sincronização de progresso</li>
              <li><Check /> Acesso em celular, tablet e desktop</li>
              <li><Check /> Atualizações do aplicativo</li>
              <li><ShieldCheck /> Garantia de 7 dias após a compra</li>
            </ul>
          </div>

          <div className="sales-price-card sales-price-card-v2">
            <small>Pagamento único</small>
            <strong><sup>R$</sup> 19,99</strong>
            <p>Acesso vitalício · sem mensalidade</p>
            <button type="button" onClick={checkout}>
              Garantir acesso agora <ArrowRight />
            </button>
            <div>
              <ShieldCheck />
              <span>
                Você tem 7 dias de garantia após a compra. O acesso é liberado somente após a
                confirmação do pagamento.
              </span>
            </div>
          </div>
        </section>

        <section className="sales-guarantee-v2">
          <div className="sales-guarantee-seal"><ShieldCheck /></div>
          <div>
            <span>GARANTIA DE 7 DIAS</span>
            <h2>Conheça o sistema com tranquilidade.</h2>
            <p>
              Após a compra, você conta com 7 dias de garantia para acessar a plataforma e conferir
              a experiência.
            </p>
          </div>
        </section>

        <section className="sales-section sales-faq">
          <div className="sales-section-heading">
            <span>DÚVIDAS RÁPIDAS</span>
            <h2>Antes de começar</h2>
          </div>
          <details>
            <summary>Quando minha conta é criada?</summary>
            <p>Somente depois que a Lastlink confirmar o pagamento. O convite é enviado para o mesmo e-mail informado na compra.</p>
          </details>
          <details>
            <summary>Posso usar em mais de um dispositivo?</summary>
            <p>Sim. O progresso e as preferências da conta são sincronizados entre dispositivos compatíveis.</p>
          </details>
          <details>
            <summary>Consigo ler sem internet?</summary>
            <p>Sim. Você pode baixar edições no dispositivo para leitura offline e sincronizar o progresso quando voltar à internet.</p>
          </details>
          <details>
            <summary>É uma assinatura mensal?</summary>
            <p>Não nesta oferta. O checkout atual é de pagamento único com acesso vitalício.</p>
          </details>
          <details>
            <summary>Existe garantia?</summary>
            <p>Sim. A oferta possui garantia de 7 dias após a compra.</p>
          </details>
        </section>
      </main>

      <footer className="sales-footer">
        <BrandLogo compact />
        <span>Biblioteca HQ</span>
        <button type="button" onClick={onLogin}>Entrar</button>
      </footer>
    </div>
  );
};
