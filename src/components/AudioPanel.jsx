import { useMemo } from 'react';
import { SOUNDTRACKS } from '../data/soundtracks';

function Slider({ label, value, onChange }) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>{Math.round(value * 100)}%</strong>
    </label>
  );
}

function TrackPicker({ tracks, selectedTrack, onSelect }) {
  return (
    <div className="track-grid">
      {tracks.map((track) => (
        <button
          key={track.id}
          className={`track-card ${selectedTrack === track.id ? 'active' : ''}`}
          onClick={() => onSelect(track.id)}
        >
          <h4>{track.name}</h4>
          <p>{track.mood}</p>
        </button>
      ))}
    </div>
  );
}

export function AudioPanel({ settings, updateSettings, activateAudio, importTrack }) {
  const tracks = useMemo(
    () => [...SOUNDTRACKS, ...(settings.customTracks || [])],
    [settings.customTracks]
  );

  const track = useMemo(
    () => tracks.find((item) => item.id === settings.selectedTrack),
    [tracks, settings.selectedTrack]
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Sound Lab</h3>
        <button className="chip" onClick={activateAudio}>Activate Audio</button>
      </div>

      <TrackPicker
        tracks={tracks}
        selectedTrack={settings.selectedTrack}
        onSelect={(id) => updateSettings({ selectedTrack: id })}
      />

      <label className="upload-row">
        <span>Import MP3</span>
        <input
          type="file"
          accept="audio/mpeg,audio/mp3,audio/*"
          onChange={importTrack}
        />
      </label>

      <div className="toggle-row">
        <button
          className={`chip ${settings.musicEnabled ? 'on' : ''}`}
          onClick={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
        >
          Music {settings.musicEnabled ? 'On' : 'Off'}
        </button>
        <button
          className={`chip ${settings.ambientEnabled ? 'on' : ''}`}
          onClick={() => updateSettings({ ambientEnabled: !settings.ambientEnabled })}
        >
          Ambient {settings.ambientEnabled ? 'On' : 'Off'}
        </button>
        <button
          className={`chip ${settings.uiSfxEnabled ? 'on' : ''}`}
          onClick={() => updateSettings({ uiSfxEnabled: !settings.uiSfxEnabled })}
        >
          UI SFX {settings.uiSfxEnabled ? 'On' : 'Off'}
        </button>
      </div>

      <div className="slider-stack">
        <Slider
          label="Master"
          value={settings.masterVolume}
          onChange={(value) => updateSettings({ masterVolume: value })}
        />
        <Slider
          label="Music"
          value={settings.musicVolume}
          onChange={(value) => updateSettings({ musicVolume: value })}
        />
        <Slider
          label="SFX"
          value={settings.sfxVolume}
          onChange={(value) => updateSettings({ sfxVolume: value })}
        />
      </div>

      <p className="track-meta">
        Current: <strong>{track?.name ?? 'Unknown'}</strong>
      </p>
    </section>
  );
}
