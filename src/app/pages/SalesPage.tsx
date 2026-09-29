import React from "react";
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
  Zap,
} from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";

const CHECKOUT_URL =
  "https://lastlink.com/p/C95A90981/checkout-payment/?utm_source=bibliotecahq&utm_medium=site&utm_campaign=acesso_vitalicio";

type Props = {
  hasAccess?: boolean;
  onLogin: () => void;
  onOpenLibrary: () => void;
};


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
  const checkout = () => {
    window.location.href = CHECKOUT_URL;
  };

  return (
    <div className="sales-page sales-page-v2">
      <header className="sales-header sales-header-reference">
        <div className="sales-brand-block">
          <BrandLogo />
          <div className="sales-brand-categories" aria-label="Categorias da Biblioteca HQ">
            <span>Mangás</span><i />
            <span>Quadrinhos</span><i />
            <span>Sagas</span><i />
            <span>Graphic Novels</span>
          </div>
        </div>
        <button className="sales-header-access" type="button" onClick={hasAccess ? onOpenLibrary : onLogin}>
          {hasAccess ? "Abrir biblioteca" : "Já tenho acesso"}
        </button>
      </header>

      <main>
        <section className="sales-hero sales-hero-v3">
          <div className="sales-hero-copy">
            <h1>
              Seu universo de quadrinhos, organizado para você
              <em> realmente ler.</em>
            </h1>
            <p>
              Mangás, quadrinhos, sagas e graphic novels em um só lugar. Descubra, explore,
              organize e continue de onde parou, com uma experiência feita por quem ama HQs.
            </p>

            <div className="sales-hero-price">
              <div>
                <small>Acesso vitalício</small>
                <strong>R$ 19,99</strong>
                <span>pagamento único</span>
              </div>
            </div>

            <div className="sales-actions sales-actions-reference">
              {hasAccess ? (
                <button className="sales-primary sales-primary-reference" type="button" onClick={onOpenLibrary}>
                  Abrir minha biblioteca <ArrowRight />
                </button>
              ) : (
                <button className="sales-primary sales-primary-reference" type="button" onClick={checkout}>
                  Quero acessar agora <ArrowRight />
                </button>
              )}
              <button className="sales-secondary sales-secondary-reference" type="button" onClick={onLogin}>
                Já tenho acesso
              </button>
            </div>

            <div className="sales-trust sales-trust-reference">
              <span><Sparkles /> Pagamento único</span>
              <span><ShieldCheck /> Checkout seguro pela Lastlink</span>
              <span><Zap /> Conta liberada após pagamento confirmado</span>
            </div>
          </div>

          <div className="sales-hero-devices" aria-label="Prévia real da Biblioteca HQ">
            <div className="sales-phone sales-phone-primary">
              <div className="sales-phone-shell">
                <div className="sales-phone-speaker" />
                <img
                  src="/sales/continue-reading.webp"
                  alt="Tela real da Biblioteca HQ na área Continuar lendo"
                  loading="eager"
                />
              </div>
            </div>
            <div className="sales-phone sales-phone-secondary">
              <div className="sales-phone-shell">
                <div className="sales-phone-speaker" />
                <img
                  src="/sales/manga-indie.webp"
                  alt="Tela real da Biblioteca HQ na área Mangá e Indie"
                  loading="eager"
                />
              </div>
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

        <section className="sales-section sales-inside-section sales-inside-reference" id="por-dentro">
          <div className="sales-section-heading sales-inside-heading">
            <span>VEJA POR DENTRO DO APP</span>
            <h2>Conheça a experiência completa antes de acessar.</h2>
            <p>
              A Biblioteca HQ mantém a mesma linguagem visual em todo o sistema: rápida, organizada
              e pensada para leitura em qualquer dispositivo.
            </p>
          </div>

          <div className="sales-inside-reference-grid">
            <article className="sales-video-card-reference">
              <div className="sales-video-media">
                <div className="sales-video-screen">
                  <img
                    src="/sales/continue-reading.webp"
                    alt="Prévia real da Biblioteca HQ para o vídeo de apresentação"
                    loading="lazy"
                  />
                  <div className="sales-video-overlay" />
                  <button type="button" className="sales-video-play-reference" aria-label="Vídeo em breve">
                    <Play />
                  </button>
                </div>
                <div className="sales-video-controls" aria-hidden="true">
                  <span />
                  <b>0:00 / 2:45</b>
                  <i />
                </div>
              </div>
              <footer>
                <strong>Vídeo explicando o sistema por dentro</strong>
                <span>Espaço reservado para o vídeo oficial assim que você enviar o link.</span>
              </footer>
            </article>

            <div className="sales-inside-screens-wrap">
              <div className="sales-hand-note">
                <span>Mesma experiência das imagens reais do app!</span>
                <svg viewBox="0 0 120 70" aria-hidden="true">
                  <path d="M8 10c35 2 63 18 91 45" />
                  <path d="M84 50l16 5-5-15" />
                </svg>
              </div>

              <div className="sales-inside-screens">
                <article>
                  <div className="sales-mini-phone">
                    <img src="/sales/continue-reading.webp" alt="Tela real Continuar lendo" loading="lazy" />
                  </div>
                  <strong>Continuar lendo</strong>
                  <span>Retome de onde parou</span>
                </article>

                <article>
                  <div className="sales-mini-phone">
                    <img src="/sales/manga-indie.webp" alt="Tela real Mangá e Indie" loading="lazy" />
                  </div>
                  <strong>Explorar coleções e sagas</strong>
                  <span>Navegação visual por universos</span>
                </article>

                <article>
                  <div className="sales-mini-phone">
                    <img src="/sales/collections.webp" alt="Tela real de coleções e sagas" loading="lazy" />
                  </div>
                  <strong>Ver todas as edições</strong>
                  <span>Filtros e ordem cronológica</span>
                </article>

                <article>
                  <div className="sales-mini-phone">
                    <img src="/sales/collections.webp" alt="Tela real de editoras e coleções" loading="lazy" />
                  </div>
                  <strong>Editoras e universos</strong>
                  <span>Acervo organizado por contexto</span>
                </article>

                <article>
                  <div className="sales-mini-phone">
                    <img src="/sales/manga-indie.webp" alt="Tela real de detalhes de edição" loading="lazy" />
                  </div>
                  <strong>Detalhes completos</strong>
                  <span>Informações antes de começar a ler</span>
                </article>
              </div>
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
