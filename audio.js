/*************************************************************************
 * FILE 3: audio.js
 * Mesin Web Audio API Synthesizer, Glass Shatter SFX, Meow Formant Synth,
 * Real-time Spectrum AnalyserNode, & MediaStream Audio Recorder
 *************************************************************************/

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.analyser = null;
        this.freqData = new Uint8Array(64);
        this.destNode = null;
        this.enabled = true;
        this.volume = 0.45;
        this.instrument = 'glassbell';
        this.deathSound = 'shatter';
        this.escapeSound = 'chime';
        this.mergeSoundMode = 'pop';
        this.customAudioBuffer = null;
        this.polyBass = true;
        this.sequence = [...MELODIES.arpeggio];
        this.noteIdx = 0;
        this.lastNoteTime = 0;
        this.lastShatterTime = 0;
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 128;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        if (this.ctx.createMediaStreamDestination) {
            this.destNode = this.ctx.createMediaStreamDestination();
            this.masterGain.connect(this.destNode);
        }
    }

    async loadCustomAudioFile(file) {
        this.init();
        const arrayBuf = await file.arrayBuffer();
        this.customAudioBuffer = await this.ctx.decodeAudioData(arrayBuf);
    }

    getSpectrumData() {
        if (!this.analyser || !this.enabled) return this.freqData;
        this.analyser.getByteFrequencyData(this.freqData);
        return this.freqData;
    }

    playMeowSynth(tierLevel = 1, isMerge = false) {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = performance.now();
        if (!isMerge && now - this.lastNoteTime < 55) return;
        this.lastNoteTime = now;

        if (this.mergeSoundMode === 'custom_sfx' && this.customAudioBuffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = this.customAudioBuffer;
            src.playbackRate.value = Math.max(0.55, 1.35 - tierLevel * 0.11);
            const g = this.ctx.createGain();
            g.gain.value = isMerge ? 0.85 : 0.45;
            src.connect(g);
            g.connect(this.masterGain);
            src.start();
            return;
        }

        const t = this.ctx.currentTime;
        const dur = isMerge ? 0.44 : 0.26;
        const baseFreq = Math.max(150, 520 - tierLevel * 48) * (0.95 + Math.random() * 0.1);

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq * 0.82, t);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.25, t + dur * 0.32);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, t + dur);

        filter.type = 'bandpass';
        filter.Q.value = 4.2;
        filter.frequency.setValueAtTime(baseFreq * 2.2, t);
        filter.frequency.linearRampToValueAtTime(baseFreq * 3.6, t + dur * 0.35);
        filter.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, t + dur);

        const peak = isMerge ? 0.48 : 0.24;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(peak, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    playMergePopSFX(tierLevel = 1) {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        if (this.mergeSoundMode === 'meow' || (this.mergeSoundMode === 'custom_sfx' && this.customAudioBuffer)) {
            this.playMeowSynth(tierLevel, true);
            return;
        }

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const baseF = 240 + tierLevel * 55;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseF * 0.6, t);
        osc.frequency.exponentialRampToValueAtTime(baseF * 1.65, t + 0.11);
        gain.gain.setValueAtTime(0.55, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.19);

        this.triggerNextNote();
    }

    triggerNextNote() {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = performance.now();
        if (now - this.lastNoteTime < 24) return;
        this.lastNoteTime = now;

        const step = this.noteIdx;
        const noteName = this.sequence[step % this.sequence.length];
        this.noteIdx = (this.noteIdx + 1) % this.sequence.length;
        const freq = NOTE_TO_FREQ[noteName] || 440;

        this.playSynth(freq, this.instrument, 0.40);

        if (this.polyBass && step % 4 === 0) {
            this.playSynth(freq * 0.5, 'warm', 0.20);
            this.playSynth(freq * 0.75, 'glassbell', 0.12);
        }
    }

    playSynth(freq, inst, peakGain = 0.40) {
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let dur = 0.42;
        if (inst === 'glassbell') {
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 2.5, t);
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(peakGain, t + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.50);
            dur = 0.52;
        } else if (inst === 'piano') {
            osc1.type = 'triangle';
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2, t);
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(peakGain, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.44);
            dur = 0.46;
        } else if (inst === 'musicbox') {
            osc1.type = 'sine';
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 3, t);
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(peakGain, t + 0.006);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.60);
            dur = 0.62;
        } else if (inst === 'marimba') {
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 4, t);
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(peakGain * 1.2, t + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            dur = 0.24;
        } else if (inst === 'synth8bit') {
            osc1.type = 'square';
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(freq * 1.005, t);
            gain.gain.setValueAtTime(peakGain * 0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
            dur = 0.21;
        } else {
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 1.002, t);
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(peakGain, t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
            dur = 0.56;
        }

        osc1.frequency.setValueAtTime(freq, t);
        const subGain = this.ctx.createGain();
        subGain.gain.value = 0.15;

        osc1.connect(gain);
        osc2.connect(subGain);
        subGain.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + dur);
        osc2.stop(t + dur);
    }

    playDeathSFX() {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = performance.now();
        if (now - this.lastShatterTime < 40) return;
        this.lastShatterTime = now;

        const t = this.ctx.currentTime;

        if (this.deathSound === 'shatter') {
            // Multi-shard crisp glass shatter sound (Matches Video Ref 1 & 2!)
            const shardFreqs = [1850, 2640, 3420, 4180];
            shardFreqs.forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
                const startT = t + idx * 0.014;
                osc.frequency.setValueAtTime(f * (0.9 + Math.random() * 0.2), startT);
                osc.frequency.exponentialRampToValueAtTime(f * 0.35, startT + 0.11);
                g.gain.setValueAtTime(0.18, startT);
                g.gain.exponentialRampToValueAtTime(0.001, startT + 0.12);
                osc.connect(g);
                g.connect(this.masterGain);
                osc.start(startT);
                osc.stop(startT + 0.13);
            });
            return;
        }

        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        if (this.deathSound === 'thud') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(145, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);
            g.gain.setValueAtTime(0.55, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.linearRampToValueAtTime(42, t + 0.20);
            g.gain.setValueAtTime(0.4, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        }
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.24);
    }

    playEscapeSFX() {
        if (!this.enabled) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t + idx * 0.055);
            g.gain.setValueAtTime(0.24, t + idx * 0.055);
            g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.55);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start(t + idx * 0.055);
            osc.stop(t + idx * 0.055 + 0.58);
        });
    }
}

const sound = new SoundEngine();