import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Gift,
  Infinity as InfinityIcon,
  Layers3,
  MonitorSmartphone,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  WifiOff,
  Zap,
  ZoomIn,
} from "lucide-react";
import { CoverFlow } from "../../components/library/CoverFlow";
import { SalesReaderDemo } from "./SalesReaderDemo";
import "./SalesPage.v5.css";

const CHECKOUT_URL =
  "https://lastlink.com/p/C95A90981/checkout-payment/?utm_source=bibliotecahq&utm_medium=site&utm_campaign=acesso_vitalicio";

const SCREENS = [
  { src: "/sales-v5/app_00.jpg", title: "Continuar lendo", copy: "Retome exatamente de onde parou." },
  { src: "/sales-v5/app_01.jpg", title: "Mangá & Indie", copy: "Explore categorias, mangás e graphic novels." },
  { src: "/sales-v5/app_02.jpg", title: "Leitura offline", copy: "Continue lendo mesmo sem conexão." },
  { src: "/sales-v5/app_03.jpg", title: "Edições organizadas", copy: "Encontre títulos em ordem cronológica." },
  { src: "/sales-v5/app_04.jpg", title: "Editoras e universos", copy: "Navegue por coleções e selos do acervo." },
  { src: "/sales-v5/app_05.jpg", title: "Detalhes completos", copy: "Sinopse, progresso e ficha de cada edição." },
  { src: "/sales-v5/app_06.jpg", title: "Leitor avançado", copy: "Zoom, ajuste da página e navegação fluida." },
];

const COVERS = [
  { id: "mask", title: "O Máskara", subtitle: "Dark Horse", image: "/sales-v5/cover_1.png" },
  { id: "dragon", title: "Dragon Ball", subtitle: "Mangá", image: "/sales-v5/cover_2.png" },
  { id: "100-balas", title: "100 Balas", subtitle: "Vertigo", image: "/sales-v5/cover_3.png" },
  { id: "poe", title: "A Máscara da Morte Rubra", subtitle: "Graphic novel", image: "/sales-v5/cover_4.png" },
  { id: "voyager", title: "Star Trek: Voyager", subtitle: "Ficção científica", image: "/sales-v5/offer_ref_5.png" },
];

const BENEFITS = [
  { icon: InfinityIcon, title: "Acesso vitalício", copy: "Pagamento único nesta oferta, sem mensalidade recorrente." },
  { icon: MonitorSmartphone, title: "Leia onde quiser", copy: "Celular, tablet e computador com a mesma conta." },
  { icon: Layers3, title: "Coleções organizadas", copy: "Editoras, sagas, fases e edições em ordem." },
  { icon: Zap, title: "Continue de onde parou", copy: "Seu progresso acompanha a conta entre dispositivos." },
  { icon: WifiOff, title: "Leitura offline", copy: "Baixe títulos compatíveis para ler sem internet." },
  { icon: ZoomIn, title: "Leitor confortável", copy: "Zoom, ajuste da página e controles próprios para HQs." },
];

const FAQ = [
  ["Como funciona o acesso após o pagamento?", "Após a confirmação do pagamento pela Lastlink, o acesso é liberado para o e-mail usado na compra. Novos clientes recebem o fluxo para criar a senha e entrar na Biblioteca HQ."],
  ["Preciso instalar algum aplicativo?", "Não. A Biblioteca HQ funciona no navegador e também pode ser instalada como PWA no celular ou tablet para abrir com aparência de aplicativo."],
  ["R$ 19,99 é mensalidade?", "Não. Nesta oferta, R$ 19,99 é um pagamento único que libera o acesso vitalício."],
  ["Posso ler offline?", "Sim. A Biblioteca HQ possui uma área de leitura offline para títulos compatíveis, armazenados no próprio dispositivo."],
  ["Como funciona a garantia de 7 dias?", "O pagamento é processado pela Lastlink. Dentro do prazo aplicável, um reembolso confirmado também revoga automaticamente o acesso vitalício."],
];

type Props = {
  hasAccess?: boolean;
  onLogin: () => void;
  onOpenLibrary: () => void;
};

export const SalesPage: React.FC<Props> = ({ hasAccess = false, onLogin, onOpenLibrary }) => {
  const [readerDemoOpen, setReaderDemoOpen] = useState(false);
  const [screenIndex, setScreenIndex] = useState(0);
  const [coverIndex, setCoverIndex] = useState(0);
  const [faqIndex, setFaqIndex] = useState<number | null>(null);

  const primaryAction = () => {
    if (hasAccess) onOpenLibrary();
    else window.location.assign(CHECKOUT_URL);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setScreenIndex((current) => (current + 1) % SCREENS.length);
    }, 4800);
    return () => window.clearInterval(id);
  }, []);

  const activeScreen = SCREENS[screenIndex] || SCREENS[0];
  const activeCover = useMemo(() => COVERS[coverIndex] || COVERS[0], [coverIndex]);

  if (readerDemoOpen) {
    return <SalesReaderDemo onClose={() => setReaderDemoOpen(false)} />;
  }

  return (
    <div className="sales-v5">
      <div className="sales-v5__pattern" aria-hidden="true" />
      <div className="sales-v5__vignette" aria-hidden="true" />

      <div className="sales-v5__content">
        <header className="sales-v5__topbar">
          <a href="#top" className="sales-v5__brand" aria-label="Biblioteca HQ">
            <img src="/sales-v5/brand_icon.jpg" alt="" />
            <span>
              <strong>Biblioteca <em>HQ</em></strong>
              <small>Mangás · quadrinhos · sagas · graphic novels</small>
            </span>
          </a>

          <nav aria-label="Navegação da página">
            <a href="#por-dentro">Por dentro</a>
            <a href="#leitor">Teste o leitor</a>
            <a href="#beneficios">Benefícios</a>
            <a href="#acesso">Acesso</a>
          </nav>

          <button type="button" className="sales-v5__login" onClick={hasAccess ? onOpenLibrary : onLogin}>
            {hasAccess ? "Abrir biblioteca" : "Já tenho acesso"}
          </button>
        </header>

        <main id="top">
          <section className="sales-v5__hero">
            <div className="sales-v5__hero-copy">
              <span className="sales-v5__eyebrow"><Sparkles /> Biblioteca HQ</span>
              <h1>Seu universo de quadrinhos, organizado para você <em>realmente ler.</em></h1>
              <p>
                Mangás, quadrinhos, sagas e graphic novels em um só lugar. Descubra, organize e continue
                de onde parou em uma experiência feita para quem realmente gosta de HQs.
              </p>

              <div className="sales-v5__price">
                <span>Pagamento único</span>
                <strong><small>R$</small> 19,99</strong>
                <b>Acesso vitalício</b>
              </div>

              <div className="sales-v5__actions">
                <button type="button" className="sales-v5__primary" onClick={primaryAction}>
                  <Play /> {hasAccess ? "Abrir minha biblioteca" : "Quero acessar agora"}
                </button>
                {!hasAccess && (
                  <button type="button" className="sales-v5__secondary" onClick={onLogin}>
                    Já tenho acesso
                  </button>
                )}
              </div>

              <div className="sales-v5__trust">
                <span><InfinityIcon /> Pagamento único</span>
                <span><ShieldCheck /> Checkout pela Lastlink</span>
                <span><Check /> Liberação após confirmação</span>
              </div>
            </div>

            <div className="sales-v5__hero-phones" aria-label="Telas reais da Biblioteca HQ">
              <div className="sales-v5__phone sales-v5__phone--front">
                <span />
                <img src="/sales-v5/app_00.jpg" alt="Tela real Continuar lendo" />
              </div>
              <div className="sales-v5__phone sales-v5__phone--back">
                <span />
                <img src="/sales-v5/app_01.jpg" alt="Tela real Mangá e Indie" />
              </div>
            </div>
          </section>

          <section className="sales-v5__section" id="por-dentro">
            <div className="sales-v5__heading">
              <span>VEJA POR DENTRO DO APP</span>
              <h2>A interface que você vai usar de verdade.</h2>
              <p>Capturas reais do próprio sistema, apresentadas dentro do mesmo conceito visual que você enviou.</p>
            </div>

            <div className="sales-v5__walkthrough">
              <div className="sales-v5__walkthrough-phone">
                <div className="sales-v5__phone sales-v5__phone--showcase">
                  <span />
                  <img src={activeScreen.src} alt={activeScreen.title} />
                </div>
                <strong>{activeScreen.title}</strong>
                <small>{activeScreen.copy}</small>
              </div>

              <div className="sales-v5__screen-grid">
                {SCREENS.map((screen, index) => (
                  <button
                    key={screen.src}
                    type="button"
                    className={index === screenIndex ? "active" : ""}
                    onClick={() => setScreenIndex(index)}
                  >
                    <img src={screen.src} alt="" loading="lazy" />
                    <span><strong>{screen.title}</strong><small>{screen.copy}</small></span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="sales-v5__reader" id="leitor">
            <div>
              <span>EXPERIMENTE ANTES DE ENTRAR</span>
              <h2>Sinta o leitor da Biblioteca HQ na prática.</h2>
              <p>
                Abra uma demonstração pública com 5 páginas. Teste navegação, ajuste da página e zoom
                sem login e sem alterar o progresso da sua conta.
              </p>
              <div className="sales-v5__reader-badges">
                <span><ZoomIn /> Zoom 100–180%</span>
                <span><BookOpen /> Ajuste da página</span>
                <span><MonitorSmartphone /> Mobile e desktop</span>
              </div>
              <button type="button" className="sales-v5__primary" onClick={() => setReaderDemoOpen(true)}>
                <BookOpen /> Testar o leitor agora
              </button>
            </div>

            <button type="button" className="sales-v5__reader-preview" onClick={() => setReaderDemoOpen(true)}>
              <img src="/sales-v5/app_06.jpg" alt="Prévia real do leitor" />
              <span><Play /></span>
              <strong>Abrir demonstração</strong>
            </button>
          </section>

          <section className="sales-v5__section sales-v5__collections">
            <div className="sales-v5__heading">
              <span>EXPLORE COLEÇÕES</span>
              <h2>Alguns títulos para sentir a experiência.</h2>
              <p>O CoverFlow passa automaticamente entre uma pequena amostra, sem carregar todo o acervo.</p>
            </div>

            <div className="sales-v5__coverflow">
              <CoverFlow
                items={COVERS}
                activeIndex={coverIndex}
                onChange={setCoverIndex}
                label="Coleções em destaque"
                autoPlayMs={3600}
              />
              <div>
                <small>EM DESTAQUE</small>
                <strong>{activeCover.title}</strong>
                <span>{activeCover.subtitle}</span>
              </div>
            </div>
          </section>

          <section className="sales-v5__section" id="beneficios">
            <div className="sales-v5__heading">
              <span>POR QUE BIBLIOTECA HQ?</span>
              <h2>Feita para ler, não apenas armazenar arquivos.</h2>
            </div>

            <div className="sales-v5__benefits">
              {BENEFITS.map(({ icon: Icon, title, copy }) => (
                <article key={title}>
                  <Icon />
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="sales-v5__section sales-v5__bonus">
            <div className="sales-v5__bonus-heading">
              <span><Gift /> BÔNUS EXCLUSIVOS INCLUSOS HOJE</span>
              <h2>Mais de R$ 150 em bônus<br />liberados gratuitamente</h2>
              <p>
                Ao garantir seu acesso vitalício à Biblioteca HQ, você recebe estes 3 complementos
                indispensáveis sem pagar 1 centavo a mais.
              </p>
            </div>

            <div className="sales-v5__bonus-grid">
              <article>
                <div className="sales-v5__bonus-top">
                  <small>BÔNUS #01</small>
                  <del>R$ 47,00</del>
                </div>
                <strong>Guia Definitivo de Ordem<br />Cronológica DC & Marvel</strong>
                <p>Mapas de leitura detalhados para nunca mais se perder em mega sagas, crossovers e fases clássicas.</p>
                <div className="sales-v5__bonus-footer">
                  <span>Preço avulso: R$ 47,00</span>
                  <b>GRÁTIS HOJE</b>
                </div>
              </article>

              <article>
                <div className="sales-v5__bonus-top">
                  <small>BÔNUS #02</small>
                  <del>R$ 37,00</del>
                </div>
                <strong>Canal VIP de Pedidos &<br />Sugestões de Novos Títulos</strong>
                <p>Envie sugestões de mangás ou HQs raras para serem adicionadas ao acervo prioritariamente para você.</p>
                <div className="sales-v5__bonus-footer">
                  <span>Preço avulso: R$ 37,00</span>
                  <b>GRÁTIS HOJE</b>
                </div>
              </article>

              <article>
                <div className="sales-v5__bonus-top">
                  <small>BÔNUS #03</small>
                  <del>R$ 67,00</del>
                </div>
                <strong>Coleções de obras raras e<br />graphic novels</strong>
                <p>Edições históricas digitalizadas em altíssima qualidade que não são mais encontradas em livrarias físicas.</p>
                <div className="sales-v5__bonus-footer">
                  <span>Preço avulso: R$ 67,00</span>
                  <b>GRÁTIS HOJE</b>
                </div>
              </article>
            </div>
          </section>

          <section className="sales-v5__guarantee">
            <div className="sales-v5__seal"><ShieldCheck /><strong>7</strong><span>DIAS</span></div>
            <div>
              <span>GARANTIA DE 7 DIAS</span>
              <h2>Conheça a Biblioteca HQ com tranquilidade.</h2>
              <p>
                O pagamento é processado pela Lastlink. Se houver reembolso confirmado dentro do prazo
                aplicável, o acesso vitalício também é revogado automaticamente.
              </p>
            </div>
            <ul>
              <li><Check /> Checkout oficial pela Lastlink</li>
              <li><Check /> Liberação automática após confirmação</li>
              <li><Check /> Revogação automática após reembolso confirmado</li>
            </ul>
          </section>

          <section className="sales-v5__section sales-v5__faq">
            <div className="sales-v5__heading">
              <span>DÚVIDAS FREQUENTES</span>
              <h2>Antes de entrar, saiba como funciona.</h2>
            </div>

            <div className="sales-v5__faq-list">
              {FAQ.map(([question, answer], index) => (
                <article key={question} className={faqIndex === index ? "open" : ""}>
                  <button type="button" onClick={() => setFaqIndex(faqIndex === index ? null : index)}>
                    <strong>{question}</strong><ChevronDown />
                  </button>
                  {faqIndex === index && <p>{answer}</p>}
                </article>
              ))}
            </div>
          </section>

          <section className="sales-v5__final" id="acesso">
            <div>
              <span>ACESSO VITALÍCIO</span>
              <h2>Comece hoje sua jornada no mundo dos HQs.</h2>
              <p>Pagamento único e acesso a toda a experiência organizada da Biblioteca HQ.</p>
            </div>
            <div>
              <small>Pagamento único</small>
              <strong><sup>R$</sup> 19,99</strong>
              <button type="button" className="sales-v5__primary" onClick={primaryAction}>
                <Play /> {hasAccess ? "Abrir minha biblioteca" : "Garantir acesso agora"}
              </button>
              <span><ShieldCheck /> Checkout seguro pela Lastlink</span>
            </div>
          </section>
        </main>

        {!hasAccess && (
          <div className="sales-v5__sticky">
            <div><small>Acesso vitalício</small><strong>R$ 19,99</strong></div>
            <button type="button" onClick={primaryAction}><Play /> Acessar agora</button>
          </div>
        )}
      </div>
    </div>
  );
};
