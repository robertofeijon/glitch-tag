import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MODE_META, CONTROL_SCHEMES } from '../constants/game';

export function GameSetup({ gameSettings, setGameSettings, activateAudio }) {
  const navigate = useNavigate();
  const [flashModeId, setFlashModeId] = useState(null);
  const flashTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
  }, []);

  const handleModeSelect = (id) => {
    setGameSettings((prev) => ({ ...prev, mode: id }));
    setFlashModeId(id);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = setTimeout(() => setFlashModeId(null), 260);
  };

  const startGame = () => {
    activateAudio();
    navigate('/game');
  };

  const goBack = () => {
    navigate('/');
  };

  const totalPlayers = Number(gameSettings.playerCount) || 0;
  const isClassicPrecision = gameSettings.mode === 'classic' && (gameSettings.classicProfile || 'precision') === 'precision';
  const effectiveTotal = isClassicPrecision ? 2 : totalPlayers;
  const botPlayers = Math.min(Number(gameSettings.aiBots) || 0, Math.max(0, effectiveTotal - 1));
  const humanPlayers = Math.max(0, effectiveTotal - botPlayers);

  return (
    <main className="layout">
      <section className="hero panel menu-shell">
        <div className="menu-topline">
          <span>GAME SETUP</span>
          <span>READY?</span>
        </div>

        <div className="menu-section-title">Select Game Mode</div>
        <div className="menu-block mode-block">
          <div className="mode-grid">
            {Object.entries(MODE_META).map(([id, meta]) => (
              <button
                key={id}
                className={`mode-card ${gameSettings.mode === id ? 'active' : ''} ${flashModeId === id ? 'flash' : ''}`}
                onClick={() => handleModeSelect(id)}
              >
                <h4>{meta.title}</h4>
                <p>{meta.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="menu-section-title">Game Settings</div>
        <p className="setup-counter">{effectiveTotal} total / {botPlayers} bots / {humanPlayers} humans {isClassicPrecision ? '(Precision Duel forces 2 players)' : ''}</p>
        <div className="menu-config simple-config">
          <label>
            Players
            <select
              value={gameSettings.playerCount}
              onChange={(event) => setGameSettings((prev) => {
                const nextCount = Number(event.target.value);
                return { ...prev, playerCount: nextCount, aiBots: Math.min(prev.aiBots, nextCount - 1) };
              })}
            >
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
              <option value={5}>5 Players</option>
              <option value={6}>6 Players</option>
              <option value={7}>7 Players</option>
              <option value={8}>8 Players</option>
            </select>
          </label>

          <label>
            AI Bots
            <select
              value={gameSettings.aiBots}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, aiBots: Math.min(Number(event.target.value), prev.playerCount - 1) }))}
            >
              {Array.from({ length: Math.max(1, gameSettings.playerCount) }, (_, i) => i)
                .filter((count) => count <= gameSettings.playerCount - 1)
                .map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
            </select>
          </label>

          {gameSettings.mode === 'classic' && (
            <label>
              Classic Profile
              <select
                value={gameSettings.classicProfile || 'precision'}
                onChange={(event) => setGameSettings((prev) => ({ ...prev, classicProfile: event.target.value }))}
              >
                <option value="precision">Precision Duel (2 players)</option>
                <option value="chaos">Chaotic Pressure</option>
                <option value="stalker">Positional Mindgame</option>
              </select>
            </label>
          )}

          {gameSettings.mode === 'team' && (
            <label>
              Team Profile
              <select
                value={gameSettings.teamProfile || 'defensive'}
                onChange={(event) => setGameSettings((prev) => ({ ...prev, teamProfile: event.target.value }))}
              >
                <option value="defensive">Defensive Positional</option>
                <option value="rush">Objective Rush</option>
                <option value="botplay">Bot Teamplay</option>
              </select>
            </label>
          )}

          <label>
            Duration
            <select
              value={gameSettings.duration}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, duration: Number(event.target.value) }))}
            >
              {Array.from({ length: Math.max(1, gameSettings.playerCount) }, (_, i) => i)
                .filter((count) => count <= gameSettings.playerCount - 1)
                .map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
            </select>
          </label>

          <label>
            Duration
            <select
              value={gameSettings.duration}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, duration: Number(event.target.value) }))}
            >
              <option value={60}>60 seconds</option>
              <option value={120}>2 minutes</option>
              <option value={180}>3 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </label>

          <label>
            Speed
            <select
              value={gameSettings.speed}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, speed: Number(event.target.value) }))}
            >
              <option value={200}>Slow</option>
              <option value={260}>Balanced</option>
              <option value={320}>Fast</option>
            </select>
          </label>
        </div>

        <div className="menu-section-title">Player Setup</div>
        <div className="player-setup-grid">
          {Array.from({ length: effectiveTotal }, (_, i) => {
            const isBot = i >= humanPlayers;
            const defaultName = isBot ? `BOT${i - humanPlayers + 1}` : `P${i + 1}`;
            const currentName = gameSettings.playerNames?.[i] || defaultName;
            const currentControls = gameSettings.playerControls?.[i] ?? i % CONTROL_SCHEMES.length;
            return (
              <div key={i} className="player-setup-item">
                <label>
                  Player {i + 1} Name
                  <input
                    type="text"
                    value={currentName}
                    onChange={(e) => {
                      const newNames = [...(gameSettings.playerNames || [])];
                      newNames[i] = e.target.value;
                      setGameSettings((prev) => ({ ...prev, playerNames: newNames }));
                    }}
                  />
                </label>
                <label>
                  Controls
                  <select
                    value={currentControls}
                    onChange={(e) => {
                      const newControls = [...(gameSettings.playerControls || [])];
                      newControls[i] = Number(e.target.value);
                      setGameSettings((prev) => ({ ...prev, playerControls: newControls }));
                    }}
                  >
                    {CONTROL_SCHEMES.map((scheme, idx) => (
                      <option key={idx} value={idx}>{scheme.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>

        <div className="launch-bar">
          <button className="cta" onClick={startGame}>LAUNCH ARENA</button>
          <button className="cta secondary" onClick={goBack}>BACK TO MENU</button>
        </div>
      </section>
    </main>
  );
}
