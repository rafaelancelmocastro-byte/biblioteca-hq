import React, { useEffect, useState } from "react";
import {
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
  X,
} from "lucide-react";
import { CoverFlow } from "../../components/library/CoverFlow";
import "./SalesPage.v5.css";

const CHECKOUT_URL =
  "https://lastlink.com/p/C95A90981/checkout-payment/?utm_source=bibliotecahq&utm_medium=site&utm_campaign=acesso_vitalicio";

const SCREENS = [
  { src: "/sales-v5/app_00.jpg", eyebrow: "SUA LEITURA", title: "Continuar lendo de onde parou", copy: "Sua leitura atual sempre salva na nuvem. Acompanhe páginas lidas e retome rapidamente." },
  { src: "/sales-v5/app_01.jpg", eyebrow: "MULTIVERSO", title: "Explorar coleções, mangás e indie", copy: "Navegação por categorias completas: mangás, sagas e graphic novels." },
  { src: "/sales-v5/app_02.jpg", eyebrow: "BIBLIOTECA OFFLINE", title: "Leitura 100% Offline no Celular e Tablet", copy: "Baixe seus títulos favoritos na memória do dispositivo e continue sem internet." },
  { src: "/sales-v5/app_03.jpg", eyebrow: "EDIÇÕES DISPONÍVEIS", title: "Edições em ordem cronológica perfeita", copy: "Filtre por ordem de lançamento ou cronológica, pesquise por título e encontre a edição certa." },
  { src: "/sales-v5/app_04.jpg", eyebrow: "UNIVERSOS & SAGAS", title: "Editoras e universos completos do acervo", copy: "DC Comics, Marvel, Vertigo, Dark Horse, Dynamite e editoras nacionais organizadas." },
  { src: "/sales-v5/app_05.jpg", eyebrow: "FICHA TÉCNICA", title: "Ficha técnica e detalhes de cada edição", copy: "Sinopse editorial completa, ano de lançamento, editora, quantidade de páginas e mais." },
];

const COVERS = [
  { id: "batman", title: "Batman", subtitle: "DC", image: "/saga-art/batman.png" },
  { id: "dc", title: "DC Comics", subtitle: "Editora", image: "/publisher-art/dc.png" },
  { id: "x-men", title: "X-Men", subtitle: "Marvel", image: "/saga-art/x-men.png" },
  { id: "superman", title: "Superman", subtitle: "DC", image: "/saga-art/superman.png" },
  { id: "marvel", title: "Marvel", subtitle: "Editora", image: "/publisher-art/marvel.png" },
  { id: "green-lantern", title: "Lanterna Verde", subtitle: "DC", image: "/saga-art/green-lantern.png" },
  { id: "jbc", title: "JBC", subtitle: "Mangás", image: "/publisher-art/jbc.png" },
  { id: "newpop", title: "NewPOP", subtitle: "Mangás", image: "/publisher-art/newpop.png" },
];

const BENEFITS = [
  { icon: InfinityIcon, title: "Acesso vitalício", copy: "Pague uma vez e tenha acesso para sempre." },
  { icon: MonitorSmartphone, title: "Leia onde quiser", copy: "No celular, tablet ou computador, com a mesma experiência." },
  { icon: Layers3, title: "Coleções organizadas", copy: "Encontre sagas, editoras e fases em ordem cronológica." },
  { icon: Zap, title: "Continue de onde parou", copy: "Suas leituras ficam salvas, prontas para retomar." },
  { icon: WifiOff, title: "Leitura offline", copy: "Baixe títulos compatíveis para continuar lendo sem internet." },
  { icon: ZoomIn, title: "Experiência fluida", copy: "Leitor confortável, rápido e pensado para quem realmente ama HQs." },
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
  const [screenIndex, setScreenIndex] = useState(1);
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
        </header>

        <main id="top">
          <section className="sales-v5__hero">
            <div className="sales-v5__hero-copy">
              <h1>Seu universo de quadrinhos, organizado para você <em>realmente ler.</em></h1>
              <p>
                Mangás, quadrinhos, sagas e graphic novels em um só lugar.
                Descubra, explore, organize e continue de onde parou, com uma experiência feita por quem ama HQs.
              </p>

              <div className="sales-v5__price">
                <del>R$ 29,99</del>
                <strong><small>R$</small> 19,99</strong>
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
                <span><InfinityIcon /> Acesso vitalício</span>
                <span><Sparkles /> Atualizações diárias</span>
                <span><Send /> Conteúdo que você pedir</span>
                <span><ShieldCheck /> Garantia de 7 dias</span>
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

          <section className="sales-v5__section sales-v5__inside" id="por-dentro">
            <div className="sales-v5__inside-heading">
              <h2>Veja por dentro do app</h2>
              <p>Conheça as telas e a experiência completa da Biblioteca HQ direto do sistema.</p>
            </div>

            <div className="sales-v5__walkthrough">
              <div className="sales-v5__walkthrough-phone">
                <div className="sales-v5__phone sales-v5__phone--showcase">
                  <span />
                  <img src={activeScreen.src} alt={activeScreen.title} />
                </div>
                <strong>{activeScreen.title}</strong>
                <small>{activeScreen.eyebrow}</small>
              </div>

              <div className="sales-v5__screens-wrap">
                <div className="sales-v5__screens-note">Mesma experiência das imagens reais do app! ↘</div>
                <div className="sales-v5__screen-grid">
                  {SCREENS.map((screen, index) => (
                    <button
                      key={screen.src}
                      type="button"
                      className={index === screenIndex ? "active" : ""}
                      onClick={() => setScreenIndex(index)}
                    >
                      <img src={screen.src} alt="" loading="lazy" />
                      <span>
                        <small>{screen.eyebrow}</small>
                        <strong>{screen.title}</strong>
                        <em>{screen.copy}</em>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="sales-v5__section sales-v5__collections">
            <div className="sales-v5__collections-heading">
              <h2>Explore coleções incríveis</h2>
              <p>Dos maiores clássicos aos títulos mais cults. Tudo organizado e pronto para você mergulhar.</p>
            </div>

            <div className="sales-v5__coverflow">
              <CoverFlow
                items={COVERS}
                activeIndex={coverIndex}
                onChange={setCoverIndex}
                label="Explore coleções incríveis"
                autoPlayMs={3600}
                visibleDistance={4}
                spreadPercent={54}
                rotationDeg={5}
              />
            </div>
          </section>

          <section className="sales-v5__section sales-v5__benefits-section" id="beneficios">
            <div className="sales-v5__benefits-heading">
              <span>POR QUE BIBLIOTECA HQ?</span>
              <h2>Por que escolher a Biblioteca HQ?</h2>
              <p>Uma plataforma pensada para leitores, do seu jeito.</p>
            </div>

            <div className="sales-v5__benefits">
              {BENEFITS.map(({ icon: Icon, title, copy }) => (
                <article key={title}>
                  <div className="sales-v5__benefit-icon"><Icon /></div>
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

          <section className="sales-v5__section sales-v5__comparison">
            <div className="sales-v5__comparison-heading">
              <h2>Por que a Biblioteca HQ é a<br />escolha mais inteligente?</h2>
              <p>Veja a diferença entre colecionar quadrinhos físicos, pagar mensalidades caras e ter seu acervo digital vitalício.</p>
            </div>

            <div className="sales-v5__comparison-grid">
              <article className="sales-v5__comparison-card">
                <span>COMPRAR HQS FÍSICAS</span>
                <div className="sales-v5__comparison-price"><strong>R$ 60 a R$ 120</strong><small>/ por edição</small></div>
                <ul>
                  <li><X /> Muito caro para acompanhar sagas completas</li>
                  <li><X /> Ocupa muito espaço e amarela com o tempo</li>
                  <li><X /> Não dá para levar dezenas em viagens</li>
                  <li><X /> Edições raras chegam a custar centenas de reais</li>
                </ul>
              </article>

              <article className="sales-v5__comparison-card">
                <span>ASSINATURAS MENSAIS</span>
                <div className="sales-v5__comparison-price"><strong>R$ 39,90</strong><small>/ todo mês</small></div>
                <ul>
                  <li><X /> Custa mais de R$ 470,00 por ano</li>
                  <li><X /> Se cancelar o pagamento, perde todo o acesso</li>
                  <li><X /> Cobranças automáticas no seu cartão</li>
                  <li><X /> Catálogos incompletos ou cheios de restrições</li>
                </ul>
              </article>

              <article className="sales-v5__comparison-card sales-v5__comparison-card--featured">
                <div className="sales-v5__comparison-badge">MELHOR CUSTO-BENEFÍCIO</div>
                <span>BIBLIOTECA HQ</span>
                <del>De R$ 29,99</del>
                <div className="sales-v5__comparison-offer">R$ 19,99</div>
                <b>PAGAMENTO ÚNICO</b>
                <ul>
                  <li><Check /> <strong>Acesso vitalício:</strong> pague uma vez e acesse para sempre</li>
                  <li><Check /> <strong>Modo Offline:</strong> baixe e leia sem internet</li>
                  <li><Check /> <strong>Leitura organizada:</strong> sagas, coleções e progresso em um só lugar</li>
                  <li><Check /> Compatível com celular, tablet e computador</li>
                  <li><Check /> Todos os 3 bônus exclusivos inclusos gratuitamente</li>
                </ul>
                <button type="button" className="sales-v5__comparison-cta" onClick={primaryAction}>
                  <Play /> {hasAccess ? "Abrir minha biblioteca" : "Garantir por R$ 19,99"}
                </button>
              </article>
            </div>
          </section>

          <section className="sales-v5__guarantee">
            <div className="sales-v5__guarantee-sealWrap">
              <div className="sales-v5__seal">
                <div className="sales-v5__seal-inner">
                  <ShieldCheck />
                  <strong>7</strong>
                  <span>DIAS</span>
                  <small>GARANTIA</small>
                </div>
              </div>
            </div>

            <div className="sales-v5__guarantee-copy">
              <span>GARANTIA DE 7 DIAS</span>
              <h2>Garantia incondicional de 7 dias</h2>
              <p>
                Teste a Biblioteca HQ por 7 dias. Se não gostar, é só pedir o reembolso.
                Sem burocracia, sem perguntas. Seu risco é zero.
              </p>
            </div>

            <ul className="sales-v5__guarantee-list">
              <li><Check /> 100% de satisfação</li>
              <li><Check /> Reembolso garantido</li>
              <li><Check /> Sem burocracia</li>
              <li><Check /> Seu dinheiro de volta</li>
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
