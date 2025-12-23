import { storage } from '../storage/LocalStorage';

type SoundType = 'slice' | 'combo' | 'miss' | 'gameOver' | 'button';

class AudioManager {
    private audioContext: AudioContext | null = null;
    private sounds: Map<SoundType, AudioBuffer[]> = new Map();
    private musicGainNode: GainNode | null = null;
    private sfxGainNode: GainNode | null = null;
    private musicSource: AudioBufferSourceNode | null = null;
    private musicBuffer: AudioBuffer | null = null;
    private isInitialized = false;
    private isMusicPlaying = false;

    async init(): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

            // Create gain nodes
            this.musicGainNode = this.audioContext.createGain();
            this.sfxGainNode = this.audioContext.createGain();

            this.musicGainNode.connect(this.audioContext.destination);
            this.sfxGainNode.connect(this.audioContext.destination);

            // Set initial volumes
            this.setMusicVolume(storage.musicVolume);
            this.setSfxVolume(storage.sfxVolume);

            // Generate sounds
            await this.generateSounds();

            this.isInitialized = true;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
        }
    }

    private async generateSounds(): Promise<void> {
        if (!this.audioContext) return;

        // Generate slice sounds (multiple variations)
        const sliceSounds: AudioBuffer[] = [];
        for (let i = 0; i < 3; i++) {
            sliceSounds.push(this.createSliceSound(0.8 + i * 0.1));
        }
        this.sounds.set('slice', sliceSounds);

        // Combo sound
        this.sounds.set('combo', [this.createComboSound()]);

        // Miss sound
        this.sounds.set('miss', [this.createMissSound()]);

        // Game over sound
        this.sounds.set('gameOver', [this.createGameOverSound()]);

        // Button click
        this.sounds.set('button', [this.createButtonSound()]);

        // Background music
        this.musicBuffer = this.createBackgroundMusic();
    }

    private createSliceSound(pitch: number = 1): AudioBuffer {
        const ctx = this.audioContext!;
        const duration = 0.15;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 30);
            const frequency = 800 * pitch + Math.random() * 200;
            data[i] = envelope * (
                Math.sin(2 * Math.PI * frequency * t) * 0.3 +
                (Math.random() * 2 - 1) * 0.2
            );
        }

        return buffer;
    }

    private createComboSound(): AudioBuffer {
        const ctx = this.audioContext!;
        const duration = 0.3;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 10);
            // Rising arpeggio effect
            const freq1 = 523.25; // C5
            const freq2 = 659.25; // E5
            const freq3 = 783.99; // G5

            let freq = freq1;
            if (t > 0.1) freq = freq2;
            if (t > 0.2) freq = freq3;

            data[i] = envelope * Math.sin(2 * Math.PI * freq * t) * 0.4;
        }

        return buffer;
    }

    private createMissSound(): AudioBuffer {
        const ctx = this.audioContext!;
        const duration = 0.4;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 8);
            // Descending tone
            const freq = 300 - t * 200;
            data[i] = envelope * Math.sin(2 * Math.PI * freq * t) * 0.3;
        }

        return buffer;
    }

    private createGameOverSound(): AudioBuffer {
        const ctx = this.audioContext!;
        const duration = 0.8;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 3);
            // Sad descending tones
            const freq = 400 - t * 150;
            data[i] = envelope * (
                Math.sin(2 * Math.PI * freq * t) * 0.3 +
                Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.2
            );
        }

        return buffer;
    }

    private createButtonSound(): AudioBuffer {
        const ctx = this.audioContext!;
        const duration = 0.08;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 50);
            data[i] = envelope * Math.sin(2 * Math.PI * 600 * t) * 0.2;
        }

        return buffer;
    }

    private createBackgroundMusic(): AudioBuffer {
        const ctx = this.audioContext!;
        const duration = 8; // 8 second loop
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(2, duration * sampleRate, sampleRate);

        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);

        // Create a chill ambient loop
        const baseFreq = 110; // A2
        const chordFreqs = [1, 1.25, 1.5, 2]; // A, C#, E, A (A major)

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const beatPos = (t % 2) / 2; // Position within 2-second beat

            let sample = 0;

            // Bass drone
            sample += Math.sin(2 * Math.PI * baseFreq * t) * 0.1;

            // Chord pads with slow modulation
            chordFreqs.forEach((mult, idx) => {
                const freq = baseFreq * 2 * mult;
                const modulation = Math.sin(2 * Math.PI * 0.1 * t + idx) * 0.3 + 0.7;
                sample += Math.sin(2 * Math.PI * freq * t) * 0.05 * modulation;
            });

            // Subtle rhythmic pulse
            const pulse = Math.sin(2 * Math.PI * 2 * t) > 0.7 ? 0.02 : 0;
            sample += Math.sin(2 * Math.PI * baseFreq * 4 * t) * pulse;

            // Add slight stereo variation
            leftChannel[i] = sample * (1 + Math.sin(2 * Math.PI * 0.05 * t) * 0.1);
            rightChannel[i] = sample * (1 - Math.sin(2 * Math.PI * 0.05 * t) * 0.1);
        }

        return buffer;
    }

    play(type: SoundType): void {
        if (!this.audioContext || !this.sfxGainNode) return;

        const buffers = this.sounds.get(type);
        if (!buffers || buffers.length === 0) return;

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Pick random variation if multiple
        const buffer = buffers[Math.floor(Math.random() * buffers.length)];

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.sfxGainNode);
        source.start();
    }

    startMusic(): void {
        if (!this.audioContext || !this.musicGainNode || !this.musicBuffer || this.isMusicPlaying) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.musicSource = this.audioContext.createBufferSource();
        this.musicSource.buffer = this.musicBuffer;
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGainNode);
        this.musicSource.start();
        this.isMusicPlaying = true;
    }

    stopMusic(): void {
        if (this.musicSource) {
            this.musicSource.stop();
            this.musicSource = null;
        }
        this.isMusicPlaying = false;
    }

    setMusicVolume(volume: number): void {
        if (this.musicGainNode) {
            this.musicGainNode.gain.value = volume * 0.5; // Music is quieter
        }
        storage.setMusicVolume(volume);
    }

    setSfxVolume(volume: number): void {
        if (this.sfxGainNode) {
            this.sfxGainNode.gain.value = volume;
        }
        storage.setSfxVolume(volume);
    }

    get musicVolume(): number {
        return storage.musicVolume;
    }

    get sfxVolume(): number {
        return storage.sfxVolume;
    }

    resume(): void {
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

export const audioManager = new AudioManager();
