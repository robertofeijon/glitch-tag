import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const LEADERBOARD_KEY = 'glitch-react-leaderboard-v1';

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object'
      ? parsed
      : { players: {}, matches: [] };
  } catch {
    return { players: {}, matches: [] };
  }
}

export function LeaderboardScreen() {
  const [board, setBoard] = useState(() => loadLeaderboard());
  const [selectedBucket, setSelectedBucket] = useState('all');

  const bucketOptions = useMemo(() => {
    const buckets = Object.values(board.buckets || {});
    return [
      { id: 'all', label: 'All Modes' },
      ...buckets.map((bucket) => ({ id: bucket.id, label: bucket.label || bucket.id })),
    ];
  }, [board]);

  const activePlayerStats = useMemo(() => {
    if (selectedBucket === 'all') return board.players || {};
    return board.buckets?.[selectedBucket]?.players || {};
  }, [board, selectedBucket]);

  const ranked = useMemo(
    () => Object.values(activePlayerStats || {})
      .sort((a, b) => (b.wins - a.wins) || (b.tags - a.tags) || (b.games - a.games))
      .slice(0, 12),
    [activePlayerStats]
  );

  const recentMatches = useMemo(
    () => [...(board.matches || [])]
      .filter((match) => selectedBucket === 'all' || match.bucketId === selectedBucket)
      .slice(-8)
      .reverse(),
    [board, selectedBucket]
  );

  const clearLeaderboard = () => {
    const empty = { players: {}, matches: [] };
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(empty));
    setBoard(empty);
  };

  return (
    <main className="layout single">
      <section className="hero panel menu-shell">
        <div className="menu-topline">
          <span>GLITCH TAG</span>
          <span>LEADERBOARD</span>
        </div>
        <p className="eyebrow">Performance Archive</p>
        <h1>Top Operators</h1>
        <p className="menu-description">Wins and tag totals are saved after each finished match.</p>

        <div className="menu-separator" aria-hidden="true" />

        <div className="leaderboard-filters">
          <label>
            Filter
            <select value={selectedBucket} onChange={(event) => setSelectedBucket(event.target.value)}>
              {bucketOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="menu-section-title">Player Rankings</div>
        {ranked.length === 0 ? (
          <p className="menu-description">No completed matches yet. Play a round to generate stats.</p>
        ) : (
          <div className="leaderboard-grid">
            {ranked.map((entry, index) => (
              <article key={entry.name} className="leaderboard-card">
                <p className="leaderboard-rank">#{index + 1}</p>
                <h4>{entry.name}</h4>
                <p>Wins: {entry.wins}</p>
                <p>Tags: {entry.tags}</p>
                <p>Games: {entry.games}</p>
              </article>
            ))}
          </div>
        )}

        <div className="menu-section-title">Recent Matches</div>
        <div className="leaderboard-history">
          {recentMatches.length === 0 ? (
            <p className="menu-description">No match history yet.</p>
          ) : (
            recentMatches.map((match) => (
              <p key={match.id}>
                {new Date(match.at).toLocaleString()} - {match.mode.toUpperCase()} ({(match.profile || 'default').toUpperCase()}) - Winner: {match.winner}
              </p>
            ))
          )}
        </div>

        <div className="launch-bar settings-actions">
          <button className="cta secondary" onClick={clearLeaderboard}>Clear Leaderboard</button>
          <Link className="cta" to="/">Back To Main Menu</Link>
        </div>
      </section>
    </main>
  );
}