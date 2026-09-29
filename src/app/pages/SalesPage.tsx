import React from "react";
import { BrandLogo } from "../../components/ui/BrandLogo";

const CHECKOUT_URL =
  "https://lastlink.com/p/C95A90981/checkout-payment/?utm_source=bibliotecahq&utm_medium=site&utm_campaign=acesso_vitalicio";

// Mapeamento das imagens fornecidas
const ASSETS = {
  bgPattern: "/image_3aef20.jpg",
  screenContinuarLendo: "/image_3aef38.jpg",
  screenMangaIndie: "/image_3aef3e.jpg",
  screenEdicoes: "/image_3aef57.jpg",
  screenColecoes: "/image_3aef5b.png",
  screenMorteRubra: "/image_3aef5f.jpg",
};

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
      <div 
        className="sales-stage-one__pattern-bg" 
        style={{ backgroundImage: `url(${ASSETS.bgPattern})` }} 
        aria-hidden="true" 
      />

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

      <main>
        {/* HERO SECTION */}
        <section className="sales-stage-one__hero">
          <div className="sales-stage-one__copy">
            <h1>
              Seu universo de quadrinhos, organizado para você
              <strong> realmente ler.</strong>
            </h1>

            <p>
              Mangás, quadrinhos, sagas e graphic novels em um só lugar. Descubra, explore,
              organize e continue de onde parou, com uma experiência feita por quem ama HQs.
            </p>

            <div className="sales-stage-one__price" aria-label="Preço promocional">
              <span className="sales-stage-one__old-price"><small>R$</small> 29,99</span>
              <span className="sales-stage-one__current-price"><small>R$</small> 19,99</span>
            </div>

            <div className="sales-stage-one__actions">
              <button
                className="sales-stage-one__primary"
                type="button"
                onClick={hasAccess ? onOpenLibrary : checkout}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>
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
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>Pagamento único</span>
              </div>
              <div>
                <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                <span>Checkout seguro pela Lastlink</span>
              </div>
              <div>
                <svg viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>Conta liberada após pagamento confirmado</span>
              </div>
            </div>
          </div>

          <div className="sales-stage-one__devices" aria-label="Telas reais da Biblioteca HQ">
            <div className="sales-stage-one__glow" aria-hidden="true" />
            
            <div className="sales-stage-one__phone sales-stage-one__phone--front">
              <div className="sales-stage-one__phone-shell">
                <span className="sales-stage-one__dynamic-island" />
                <img src={ASSETS.screenContinuarLendo} alt="Continuar lendo" loading="eager" />
              </div>
            </div>

            <div className="sales-stage-one__phone sales-stage-one__phone--back">
              <div className="sales-stage-one__phone-shell">
                <span className="sales-stage-one__dynamic-island" />
                <img src={ASSETS.screenMangaIndie} alt="Mangá e Indie" loading="eager" />
              </div>
            </div>
          </div>
        </section>

        {/* INSIDE THE APP SECTION */}
        <section className="sales-section">
          <div className="sales-section-heading">
            <h2>Veja por dentro do app</h2>
            <p>Assista ao vídeo e conheça a experiência completa da Biblioteca HQ.</p>
          </div>
          
          <div className="sales-inside-reference-grid">
            <div className="sales-video-card-reference">
              <div className="sales-video-media">
                <div className="sales-video-screen">
                  <img src={ASSETS.screenMorteRubra} alt="Capa do Vídeo" />
                  <div className="sales-video-overlay" />
                  <button className="sales-video-play-reference" aria-label="Play video">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                </div>
                <div className="sales-video-controls">
                  <span></span>
                  <b>0:00 / 2:45</b>
                  <i></i>
                </div>
              </div>
              <footer>
                <strong>Vídeo explicando o sistema por dentro</strong>
                <span>Descubra como é fácil organizar e ler suas HQs.</span>
              </footer>
            </div>

            <div className="sales-inside-screens-wrap">
              <div className="sales-hand-note">
                <span>Mesma experiência das imagens reais do app!</span>
                <svg viewBox="0 0 100 50"><path d="M10,40 Q40,10 90,40 M80,30 L90,40 L80,50" /></svg>
              </div>
              
              <div className="sales-inside-screens">
                <article>
                  <div className="sales-mini-phone"><img src={ASSETS.screenContinuarLendo} alt="Tela" /></div>
                  <strong>Continuar lendo</strong>
                  <span>de onde parou</span>
                </article>
                <article>
                  <div className="sales-mini-phone"><img src={ASSETS.screenMangaIndie} alt="Tela" /></div>
                  <strong>Explore coleções</strong>
                  <span>e sagas</span>
                </article>
                <article>
                  <div className="sales-mini-phone"><img src={ASSETS.screenEdicoes} alt="Tela" /></div>
                  <strong>Ver todas as edições</strong>
                  <span>da coleção</span>
                </article>
                <article>
                  <div className="sales-mini-phone"><img src={ASSETS.screenColecoes} alt="Tela" /></div>
                  <strong>Editoras e universos</strong>
                  <span>do acervo</span>
                </article>
                <article>
                  <div className="sales-mini-phone"><img src={ASSETS.screenMorteRubra} alt="Tela" /></div>
                  <strong>Detalhes completos</strong>
                  <span>de cada edição</span>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* EXPLORE COLLECTION SECTION */}
        <section className="sales-section sales-inside-section">
          <div className="sales-section-heading">
            <h2>Explore coleções incríveis</h2>
            <p>Dos maiores clássicos aos títulos mais cults. Tudo organizado e pronto para você mergulhar.</p>
          </div>
          
          <div className="sales-preview-covers" style={{ perspective: '1200px', margin: '3rem 0' }}>
            <img src={ASSETS.screenMorteRubra} alt="HQ 1" style={{ transform: 'translateX(40%) rotateY(15deg) scale(0.8)', opacity: 0.6 }} />
            <img src={ASSETS.screenEdicoes} alt="HQ 2" style={{ transform: 'translateX(15%) rotateY(10deg) scale(0.9)', opacity: 0.85 }} />
            <img src={ASSETS.screenMangaIndie} alt="HQ 3" style={{ zIndex: 3, transform: 'scale(1.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }} />
            <img src={ASSETS.screenColecoes} alt="HQ 4" style={{ transform: 'translateX(-15%) rotateY(-10deg) scale(0.9)', opacity: 0.85 }} />
            <img src={ASSETS.screenContinuarLendo} alt="HQ 5" style={{ transform: 'translateX(-40%) rotateY(-15deg) scale(0.8)', opacity: 0.6 }} />
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="sales-section sales-inside-section">
          <div className="sales-section-heading">
            <h2>Por que escolher a Biblioteca HQ?</h2>
            <p>Uma plataforma pensada para leitores, do seu jeito.</p>
          </div>
          
          <div className="sales-feature-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
            <article>
              <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm14 4c0-2.2-1.8-4-4-4s-4 1.8-4 4 1.8 4 4 4 4-1.8 4-4z"/></svg>
              <h3>Acesso vitalício</h3>
              <p>Pague uma vez e tenha acesso para sempre.</p>
            </article>
            <article>
              <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
              <h3>Leia onde quiser</h3>
              <p>No celular, tablet ou computador, com a mesma experiência.</p>
            </article>
            <article>
              <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>
              <h3>Coleções organizadas</h3>
              <p>Encontre sagas, editoras e fases em ordem cronológica, como tem que ser.</p>
            </article>
            <article>
              <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <h3>Continue de onde parou</h3>
              <p>Suas leituras sempre salvas, prontas para retomar.</p>
            </article>
            <article>
              <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <h3>Mangás, quadrinhos e muito mais</h3>
              <p>Dos clássicos aos títulos independentes, tudo no mesmo lugar.</p>
            </article>
            <article>
              <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <h3>Experiência fluida</h3>
              <p>Interface moderna, rápida e feita por quem realmente ama HQs.</p>
            </article>
          </div>
        </section>

        {/* GUARANTEE & FINAL CTA */}
        <section className="sales-section">
          <div className="sales-guarantee-v2" style={{ maxWidth: '800px', margin: '0 auto 3rem' }}>
            <div className="sales-guarantee-seal" style={{ borderColor: '#facc15', background: 'rgba(250,204,21,0.1)', width: '5rem', height: '5rem' }}>
              <div style={{ textAlign: 'center', color: '#facc15', lineHeight: 1 }}>
                <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 900 }}>7</span>
                <small style={{ fontSize: '0.6rem', fontWeight: 800 }}>DIAS</small>
              </div>
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem' }}>Garantia incondicional de 7 dias</h2>
              <p style={{ fontSize: '0.85rem' }}>Teste a Biblioteca HQ por 7 dias. Se não gostar, é só pedir o reembolso. Sem burocracia, sem perguntas. Seu risco é zero.</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg viewBox="0 0 24 24" width="14" fill="none" stroke="#facc15" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg> 100% de satisfação</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg viewBox="0 0 24 24" width="14" fill="none" stroke="#facc15" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg> Reembolso garantido</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg viewBox="0 0 24 24" width="14" fill="none" stroke="#facc15" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg> Sem burocracia</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg viewBox="0 0 24 24" width="14" fill="none" stroke="#facc15" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg> Seu dinheiro de volta</li>
            </ul>
          </div>

          <div className="sales-offer-v2" style={{ padding: '2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(135deg, rgba(20,27,36,0.95), rgba(9,13,18,0.96))' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h2 style={{ fontSize: '2rem', color: 'white', margin: 0, lineHeight: 1.1 }}>Comece hoje mesmo <br/>sua jornada no mundo dos HQs</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '1rem' }}>Acesso imediato, pagamento único e todo o acervo organizado para você explorar quando e onde quiser.</p>
            </div>
            
            <div style={{ flex: '1 1 300px', textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: '#71717a', textDecoration: 'line-through', fontSize: '0.9rem' }}>De R$ 29,99</span>
                <strong style={{ color: '#facc15', fontSize: '3rem', lineHeight: 1, margin: '0.2rem 0 1rem' }}><small style={{ fontSize: '1.2rem', verticalAlign: 'super' }}>R$</small> 19,99</strong>
                <button 
                  onClick={checkout}
                  className="sales-stage-one__primary" 
                  style={{ width: '100%', padding: '1rem 2rem', fontSize: '1rem', minHeight: '3.8rem' }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
                  Garantir acesso agora
                </button>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.65rem', color: '#94a3b8', justifyContent: 'center', width: '100%' }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><svg viewBox="0 0 24 24" width="12" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> Pagamento único</span>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><svg viewBox="0 0 24 24" width="12" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg> Checkout seguro</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
