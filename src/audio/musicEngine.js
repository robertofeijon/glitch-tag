import { SOUNDTRACKS } from '../data/soundtracks';

class MusicEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.currentTrackId = null;
    this.stepTimer = null;
    this.stepIndex = 0;
    this.voiceA = null;
    this.voiceB = null;
    this.ambientNoise = null;
    this.ambientFilter = null;
    this.ambientActive = false;
    this.customAudio = null;
    this.customTrackMap = new Map();
  }

  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.masterGain.gain.value = 0.55;
      this.musicGain.gain.value = 0.5;
      this.sfxGain.gain.value = 0.55;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return true;
  }

  unlock() {
    return this.ensureContext();
  }

  setSettings(settings) {
    if (!this.ensureContext()) return;

    this.masterGain.gain.setTargetAtTime(settings.masterVolume, this.ctx.currentTime, 0.02);
    this.musicGain.gain.setTargetAtTime(
      settings.musicEnabled ? settings.musicVolume : 0,
      this.ctx.currentTime,
      0.02
    );
    this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, this.ctx.currentTime, 0.02);

    this.syncCustomAudioVolume(settings);

    if (settings.ambientEnabled) {
      this.startAmbient();
    } else {
      this.stopAmbient();
    }

    if (
      this.currentTrackId !== settings.selectedTrack ||
      !settings.musicEnabled ||
      (settings.musicEnabled && !this.voiceA && !this.customAudio)
    ) {
      this.playTrack(settings.selectedTrack, settings.musicEnabled);
    }
  }

  setCustomTracks(customTracks = []) {
    this.customTrackMap.clear();
    for (const track of customTracks) {
      if (track?.id && track?.url) this.customTrackMap.set(track.id, track.url);
    }
  }

  playTrack(trackId, shouldPlay = true) {
    this.stopTrack();
    this.stopCustomTrack();
    this.currentTrackId = trackId;
    if (!shouldPlay || !this.ensureContext()) return;

    if (trackId && trackId.startsWith('custom:')) {
      this.playCustomTrack(trackId);
      return;
    }

    const track = SOUNDTRACKS.find((item) => item.id === trackId) || SOUNDTRACKS[0];
    this.voiceA = this.ctx.createOscillator();
    this.voiceB = this.ctx.createOscillator();
    const gainA = this.ctx.createGain();
    const gainB = this.ctx.createGain();

    this.voiceA.type = track.wave;
    this.voiceB.type = 'triangle';
    gainA.gain.value = 0.15;
    gainB.gain.value = 0.09;

    this.voiceA.connect(gainA);
    this.voiceB.connect(gainB);
    gainA.connect(this.musicGain);
    gainB.connect(this.musicGain);

    this.voiceA.start();
    this.voiceB.start();

    const beatMs = Math.max(60, Math.floor(60000 / track.bpm));
    this.stepIndex = 0;

    const advance = () => {
      const now = this.ctx.currentTime;
      const note = track.pattern[this.stepIndex % track.pattern.length];
      const bass = track.bass[this.stepIndex % track.bass.length];
      this.voiceA.frequency.setTargetAtTime(note, now, 0.01);
      this.voiceB.frequency.setTargetAtTime(bass, now, 0.03);
      this.stepIndex += 1;
    };

    advance();
    this.stepTimer = setInterval(advance, beatMs);
  }

  playCustomTrack(trackId) {
    const url = this.customTrackMap.get(trackId);
    if (!url) return;

    this.customAudio = new Audio(url);
    this.customAudio.loop = true;
    this.customAudio.crossOrigin = 'anonymous';
    this.syncCustomAudioVolume();
    this.customAudio.play().catch(() => {});
  }

  syncCustomAudioVolume(settings) {
    if (!this.customAudio) return;
    const safeSettings = settings || {
      masterVolume: this.masterGain?.gain?.value ?? 0.55,
      musicVolume: this.musicGain?.gain?.value ?? 0.5,
      musicEnabled: true,
    };
    const vol = safeSettings.musicEnabled
      ? safeSettings.masterVolume * safeSettings.musicVolume
      : 0;
    this.customAudio.volume = Math.max(0, Math.min(1, vol));
  }

  stopCustomTrack() {
    if (!this.customAudio) return;
    this.customAudio.pause();
    this.customAudio.src = '';
    this.customAudio = null;
  }

  stopTrack() {
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }

    if (this.voiceA) {
      this.voiceA.stop();
      this.voiceA.disconnect();
      this.voiceA = null;
    }

    if (this.voiceB) {
      this.voiceB.stop();
      this.voiceB.disconnect();
      this.voiceB = null;
    }
  }

  startAmbient() {
    if (this.ambientActive || !this.ensureContext()) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      output[i] = (Math.random() * 2 - 1) * 0.16;
    }

    this.ambientNoise = this.ctx.createBufferSource();
    this.ambientNoise.buffer = noiseBuffer;
    this.ambientNoise.loop = true;

    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.value = 420;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;

    this.ambientNoise.connect(this.ambientFilter);
    this.ambientFilter.connect(gain);
    gain.connect(this.musicGain);

    this.ambientNoise.start();
    this.ambientActive = true;
  }

  stopAmbient() {
    if (!this.ambientActive) return;

    if (this.ambientNoise) {
      this.ambientNoise.stop();
      this.ambientNoise.disconnect();
      this.ambientNoise = null;
    }
    if (this.ambientFilter) {
      this.ambientFilter.disconnect();
      this.ambientFilter = null;
    }
    this.ambientActive = false;
  }

  playUiClick(enabled) {
    if (!enabled || !this.ensureContext()) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 660;
    gain.gain.value = 0.06;

    osc.connect(gain);
    gain.connect(this.sfxGain);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.085);
  }
}

export const musicEngine = new MusicEngine();
