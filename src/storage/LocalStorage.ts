interface StorageData {
    highScore: number;
    gamesPlayed: number;
    totalSlices: number;
    musicVolume: number;
    sfxVolume: number;
}

const STORAGE_KEY = 'ninja-slicer-data';

const DEFAULT_DATA: StorageData = {
    highScore: 0,
    gamesPlayed: 0,
    totalSlices: 0,
    musicVolume: 0.5,
    sfxVolume: 0.7,
};

class Storage {
    private data: StorageData;

    constructor() {
        this.data = this.load();
    }

    private load(): StorageData {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_DATA, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load storage:', e);
        }
        return { ...DEFAULT_DATA };
    }

    private save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save storage:', e);
        }
    }

    get highScore(): number {
        return this.data.highScore;
    }

    setHighScore(score: number): boolean {
        if (score > this.data.highScore) {
            this.data.highScore = score;
            this.save();
            return true;
        }
        return false;
    }

    get gamesPlayed(): number {
        return this.data.gamesPlayed;
    }

    incrementGamesPlayed(): void {
        this.data.gamesPlayed++;
        this.save();
    }

    get totalSlices(): number {
        return this.data.totalSlices;
    }

    addSlices(count: number): void {
        this.data.totalSlices += count;
        this.save();
    }

    get musicVolume(): number {
        return this.data.musicVolume;
    }

    setMusicVolume(volume: number): void {
        this.data.musicVolume = Math.max(0, Math.min(1, volume));
        this.save();
    }

    get sfxVolume(): number {
        return this.data.sfxVolume;
    }

    setSfxVolume(volume: number): void {
        this.data.sfxVolume = Math.max(0, Math.min(1, volume));
        this.save();
    }
}

export const storage = new Storage();
