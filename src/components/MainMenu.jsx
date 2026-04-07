import { useNavigate } from 'react-router-dom';

export function MainMenu({ activateAudio }) {
  const navigate = useNavigate();

  const handlePlay = () => {
    activateAudio();
    navigate('/setup');
  };

  const handleCustomize = () => {
    navigate('/editor');
  };

  const handleLeaderboard = () => {
    navigate('/leaderboard');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <main className="layout single">
      <section className="hero panel menu-shell">
        <div className="menu-topline">
          <span>GLITCH TAG</span>
          <span>MAIN MENU</span>
        </div>
        <h1>COMMAND CENTER</h1>
        
        <div className="main-menu-buttons">
          <button className="main-menu-btn play-btn" onClick={handlePlay}>
            <span className="btn-label">PLAY</span>
            <span className="btn-desc">Start a new match</span>
          </button>
          
          <button className="main-menu-btn customize-btn" onClick={handleCustomize}>
            <span className="btn-label">CUSTOMIZE</span>
            <span className="btn-desc">Edit maps & settings</span>
          </button>
          
          <button className="main-menu-btn leaderboard-btn" onClick={handleLeaderboard}>
            <span className="btn-label">LEADERBOARD</span>
            <span className="btn-desc">View stats & scores</span>
          </button>
          
          <button className="main-menu-btn settings-btn" onClick={handleSettings}>
            <span className="btn-label">SETTINGS</span>
            <span className="btn-desc">Audio & graphics</span>
          </button>
        </div>
      </section>
    </main>
  );
}
