import { Link } from 'react-router-dom';

export function LandingPage({ activateAudio }) {
  return (
    <main className="layout single">
      <section className="hero panel">
        <p className="eyebrow">Glitch Tag React Edition</p>
        <h1>Native React gameplay, standalone menu, and custom music imports.</h1>
        <p>
          Start from the dedicated menu screen to choose Classic, Tournament, or Custom mode.
          Audio settings and imported tracks carry across screens.
        </p>
        <div className="cta-row">
          <Link className="cta" to="/menu" onClick={activateAudio}>Enter Game Menu</Link>
        </div>
      </section>
    </main>
  );
}
