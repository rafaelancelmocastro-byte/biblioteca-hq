import React, { useState } from "react";
import { ArrowRight, BookOpen, Check, Cloud, Download, Layers3, MonitorSmartphone, Play, Search, ShieldCheck, Sparkles, ZoomIn } from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { CoverFlow } from "../../components/library/CoverFlow";

const CHECKOUT_URL = "https://lastlink.com/p/C95A90981/checkout-payment/?utm_source=bibliotecahq&utm_medium=site&utm_campaign=acesso_vitalicio";

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
  { icon: Layers3, title: "Coleções organizadas", copy: "Editoras, coleções, sagas, fases e edições em uma navegação feita para quadrinhos." },
  { icon: Download, title: "Leitura offline", copy: "Baixe no dispositivo e continue lendo mesmo sem conexão." },
  { icon: Cloud, title: "Progresso sincronizado", copy: "Continue de onde parou ao alternar entre celular, tablet e computador." },
  { icon: ZoomIn, title: "Leitor confortável", copy: "Zoom, rolagem, página única ou dupla e controles adaptados a telas menores." },
  { icon: Search, title: "Busca rápida", copy: "Encontre séries, anos, personagens e edições sem se perder no acervo." },
  { icon: BookOpen, title: "Feita para leitura", copy: "Favoritos, continuar lendo, lançamentos e guia de leitura no mesmo lugar." },
];

export const SalesPage: React.FC<Props> = ({ hasAccess = false, onLogin, onOpenLibrary }) => {
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const checkout = () => { window.location.href = CHECKOUT_URL; };

  return (
    <div className="sales-page">
      <header className="sales-header">
        <BrandLogo showTagline />
        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#acesso">Acesso</a>
          <button type="button" onClick={hasAccess ? onOpenLibrary : onLogin}>{hasAccess ? "Abrir biblioteca" : "Entrar"}</button>
        </nav>
      </header>

      <main>
        <section className="sales-hero">
          <div className="sales-hero-copy">
            <span className="sales-eyebrow"><Sparkles /> Biblioteca HQ</span>
            <h1>Seu universo de quadrinhos, organizado para você realmente ler.</h1>
            <p>Um acervo digital pensado para encontrar séries, acompanhar sagas e continuar a leitura em qualquer tela — sem transformar sua biblioteca em uma pasta de arquivos.</p>
            <div className="sales-actions">
              {hasAccess ? (
                <button className="sales-primary" type="button" onClick={onOpenLibrary}>Abrir minha biblioteca <ArrowRight /></button>
              ) : (
                <button className="sales-primary" type="button" onClick={checkout}>Quero acesso vitalício <ArrowRight /></button>
              )}
              <button className="sales-secondary" type="button" onClick={onLogin}>Já tenho acesso</button>
            </div>
            <div className="sales-trust">
              <span><Check /> Pagamento único</span>
              <span><ShieldCheck /> 7 dias de garantia</span>
              <span><Check /> Checkout seguro pela Lastlink</span>
              <span><Check /> Conta liberada após pagamento confirmado</span>
            </div>
          </div>

          <div className="sales-product-preview" aria-label="Coleções em destaque">
            <div className="sales-preview-top"><span>Coleções em destaque</span><span>rotação automática</span></div>
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
                <small>COLEÇÃO EM DESTAQUE</small>
                <strong>{showcaseCollections[showcaseIndex]?.title}</strong>
              </div>
              <BookOpen />
            </div>
          </div>
        </section>

        <section className="sales-strip" aria-label="Principais benefícios">
          <span>Mobile</span><i /> <span>Tablet</span><i /> <span>Desktop</span><i /> <span>Offline</span><i /> <span>Sincronizado</span>
        </section>

        <section className="sales-section" id="recursos">
          <div className="sales-section-heading"><span>FEITO PARA ACERVOS GRANDES</span><h2>Menos tempo procurando. Mais tempo lendo.</h2><p>A experiência foi construída em volta da biblioteca e do leitor, com o mesmo design em todos os dispositivos.</p></div>
          <div className="sales-feature-grid">
            {features.map(({ icon: Icon, title, copy }) => <article key={title}><Icon /><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </section>

        <section className="sales-section sales-inside-section" id="por-dentro">
          <div className="sales-section-heading">
            <span>VEJA O SISTEMA POR DENTRO</span>
            <h2>Interface real, feita para navegar e ler.</h2>
            <p>Deixamos a página pronta para receber capturas reais do catálogo, das coleções e do leitor, além de um vídeo demonstrativo.</p>
          </div>

          <div className="sales-app-media">
            <div className="sales-app-shots">
              <article className="sales-shot-slot sales-shot-slot-main">
                <MonitorSmartphone />
                <strong>Print real · Catálogo</strong>
                <span>Área reservada para uma captura ampla da Biblioteca em desktop ou tablet.</span>
              </article>
              <article className="sales-shot-slot">
                <Layers3 />
                <strong>Print real · Coleções</strong>
                <span>Área reservada para mostrar CoverFlow, sagas e organização cronológica.</span>
              </article>
              <article className="sales-shot-slot">
                <BookOpen />
                <strong>Print real · Leitor</strong>
                <span>Área reservada para leitura, zoom, progresso e modo offline.</span>
              </article>
            </div>

            <div className="sales-video-slot">
              <div className="sales-video-placeholder" role="img" aria-label="Espaço reservado para vídeo demonstrativo">
                <span className="sales-video-play"><Play /></span>
                <strong>Vídeo: veja como funciona por dentro</strong>
                <small>Espaço preparado para incorporar o vídeo demonstrativo quando o arquivo ou link estiver pronto.</small>
              </div>
            </div>
          </div>
        </section>

        <section className="sales-section sales-flow-section" id="como-funciona">
          <div className="sales-section-heading"><span>ACESSO SEM TROCA DE MENSAGENS</span><h2>Comprou, confirmou, entrou.</h2><p>O pagamento é validado automaticamente. Sua conta só é criada depois que a Lastlink confirma a compra.</p></div>
          <div className="sales-flow">
            <article><b>1</b><h3>Finalize a compra</h3><p>Você conclui o pagamento no checkout seguro da Lastlink.</p></article>
            <article><b>2</b><h3>Pagamento confirmado</h3><p>A Lastlink avisa a Biblioteca HQ automaticamente.</p></article>
            <article><b>3</b><h3>Receba seu convite</h3><p>O convite chega no mesmo e-mail usado na compra.</p></article>
            <article><b>4</b><h3>Crie sua senha</h3><p>Defina sua senha e acesse a biblioteca imediatamente.</p></article>
          </div>
        </section>

        <section className="sales-offer" id="acesso">
          <div className="sales-offer-copy">
            <span>ACESSO VITALÍCIO</span>
            <h2>Uma compra. Sua biblioteca sempre disponível.</h2>
            <p>Sem mensalidade para o plano desta oferta. O acesso fica vinculado ao e-mail usado no checkout.</p>
            <ul>
              <li><Check /> Biblioteca completa e organizada</li>
              <li><Check /> Leitura offline e sincronização</li>
              <li><Check /> Acesso em celular, tablet e desktop</li>
              <li><Check /> Atualizações do aplicativo</li>
              <li><ShieldCheck /> Garantia de 7 dias após a compra</li>
            </ul>
          </div>
          <div className="sales-price-card">
            <small>Pagamento único</small>
            <strong><sup>R$</sup> 19,99</strong>
            <p>Pagamento único · acesso vitalício.</p>
            <button type="button" onClick={checkout}>Garantir acesso vitalício <ArrowRight /></button>
            <div><ShieldCheck /> 7 dias de garantia após a compra. Sua conta é liberada somente depois da confirmação do pagamento.</div>
          </div>
        </section>

        <section className="sales-section sales-faq">
          <div className="sales-section-heading"><span>DÚVIDAS RÁPIDAS</span><h2>Antes de começar</h2></div>
          <details><summary>Quando minha conta é criada?</summary><p>Somente depois que a Lastlink confirmar o pagamento. O convite é enviado para o mesmo e-mail informado na compra.</p></details>
          <details><summary>Posso usar em mais de um dispositivo?</summary><p>Sim. O progresso e preferências da conta são sincronizados entre dispositivos compatíveis.</p></details>
          <details><summary>Consigo ler sem internet?</summary><p>Sim. Você pode baixar edições no dispositivo para leitura offline e sincronizar o progresso quando voltar à internet.</p></details>
          <details><summary>É uma assinatura mensal?</summary><p>Não nesta oferta. O checkout atual é de pagamento único com acesso vitalício.</p></details>
          <details><summary>Existe garantia?</summary><p>Sim. A oferta possui garantia de 7 dias após a compra.</p></details>
        </section>
      </main>

      <footer className="sales-footer"><BrandLogo compact /><span>Biblioteca HQ</span><button type="button" onClick={onLogin}>Entrar</button></footer>
    </div>
  );
};
