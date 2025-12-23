import { Dish, createRandomDish } from './Dish';
import { Slicer } from './Slicer';
import { ParticleSystem } from './Particles';
import { randomRange } from './Physics';
import { audioManager } from '../audio/AudioManager';
import { storage } from '../storage/LocalStorage';

export enum GameState {
    MENU = 'menu',
    PLAYING = 'playing',
    PAUSED = 'paused',
    GAME_OVER = 'gameOver',
}

export interface GameCallbacks {
    onScoreChange: (score: number) => void;
    onComboChange: (combo: number) => void;
    onLivesChange: (lives: number) => void;
    onStateChange: (state: GameState) => void;
    onGameOver: (score: number, isNewRecord: boolean) => void;
}

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number = 0;
    private height: number = 0;

    private dishes: Dish[] = [];
    private slicer: Slicer;
    private particles: ParticleSystem;

    private state: GameState = GameState.MENU;
    private score: number = 0;
    private combo: number = 0;
    private comboTimer: number = 0;
    private lives: number = 3;
    private maxLives: number = 3;

    private spawnTimer: number = 0;
    private spawnInterval: number = 1.5;
    private minSpawnInterval: number = 0.4;
    private difficulty: number = 1;

    private lastTime: number = 0;
    private animationFrameId: number = 0;

    private readonly gravity = 600;
    private readonly comboTimeout = 0.8;

    private callbacks: GameCallbacks | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.slicer = new Slicer();
        this.particles = new ParticleSystem();

        this.resize();
        this.setupEventListeners();
    }

    private resize(): void {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(dpr, dpr);
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', () => this.resize());

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e.clientX, e.clientY));
        this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e.clientX, e.clientY));
        this.canvas.addEventListener('mouseup', () => this.handlePointerUp());
        this.canvas.addEventListener('mouseleave', () => this.handlePointerUp());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handlePointerDown(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handlePointerMove(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => this.handlePointerUp());
        this.canvas.addEventListener('touchcancel', () => this.handlePointerUp());
    }

    private handlePointerDown(x: number, y: number): void {
        if (this.state !== GameState.PLAYING) return;
        this.slicer.startSlice(x, y);
        audioManager.resume();
    }

    private handlePointerMove(x: number, y: number): void {
        if (this.state !== GameState.PLAYING) return;
        this.slicer.moveSlice(x, y);
        this.checkSliceCollisions();
    }

    private handlePointerUp(): void {
        this.slicer.endSlice();
    }

    private checkSliceCollisions(): void {
        if (!this.slicer.canSlice) return;

        const points = this.slicer.getRecentPoints();
        if (points.length === 0) return;

        let slicedThisFrame = 0;

        for (const dish of this.dishes) {
            if (dish.isSliced) continue;

            for (const point of points) {
                if (dish.containsPoint(point.x, point.y)) {
                    this.sliceDish(dish);
                    slicedThisFrame++;
                    break;
                }
            }
        }

        if (slicedThisFrame > 0) {
            // Add combo for multiple slices
            if (slicedThisFrame > 1) {
                this.combo += slicedThisFrame;
                audioManager.play('combo');
            }
        }
    }

    private sliceDish(dish: Dish): void {
        dish.slice(this.slicer.sliceAngle);

        // Update score with combo multiplier
        const multiplier = Math.max(1, this.combo);
        const points = dish.points * multiplier;
        this.score += points;

        // Update combo
        this.combo++;
        this.comboTimer = this.comboTimeout;

        // Effects
        audioManager.play('slice');
        this.particles.emit(dish.position, dish.color, 15);

        // Track stats
        storage.addSlices(1);

        this.callbacks?.onScoreChange(this.score);
        this.callbacks?.onComboChange(this.combo);
    }

    setCallbacks(callbacks: GameCallbacks): void {
        this.callbacks = callbacks;
    }

    start(): void {
        this.reset();
        this.state = GameState.PLAYING;
        this.callbacks?.onStateChange(this.state);
        audioManager.startMusic();
        storage.incrementGamesPlayed();

        if (this.animationFrameId === 0) {
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }

    pause(): void {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
            this.callbacks?.onStateChange(this.state);
        }
    }

    resume(): void {
        if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            this.lastTime = performance.now();
            this.callbacks?.onStateChange(this.state);
        }
    }

    private reset(): void {
        this.dishes = [];
        this.particles.clear();
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.lives = this.maxLives;
        this.spawnTimer = 0;
        this.spawnInterval = 1.5;
        this.difficulty = 1;

        this.callbacks?.onScoreChange(0);
        this.callbacks?.onComboChange(0);
        this.callbacks?.onLivesChange(this.maxLives);
    }

    private gameLoop = (): void => {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        if (this.state === GameState.PLAYING) {
            this.update(dt);
        }

        this.render();

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };

    private update(dt: number): void {
        // Update difficulty
        this.difficulty = 1 + this.score / 500;
        this.spawnInterval = Math.max(
            this.minSpawnInterval,
            1.5 - this.difficulty * 0.1
        );

        // Spawn dishes
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnDish();
            this.spawnTimer = this.spawnInterval + randomRange(-0.3, 0.3);

            // Sometimes spawn multiple
            if (this.difficulty > 2 && Math.random() < 0.3) {
                setTimeout(() => this.spawnDish(), 200);
            }
        }

        // Update combo timer
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.callbacks?.onComboChange(0);
            }
        }

        // Update dishes
        for (let i = this.dishes.length - 1; i >= 0; i--) {
            const dish = this.dishes[i];
            dish.update(dt, this.gravity);

            // Check if dish fell off screen
            if (dish.isOffScreen(this.height)) {
                if (!dish.isSliced) {
                    // Missed a dish!
                    this.loseLife();
                }
                this.dishes.splice(i, 1);
            } else if (dish.isSliced && dish.alpha <= 0) {
                this.dishes.splice(i, 1);
            }
        }

        // Update slicer and particles
        this.slicer.update();
        this.particles.update(dt);
    }

    private spawnDish(): void {
        const dish = createRandomDish(this.width, this.height);
        this.dishes.push(dish);
    }

    private loseLife(): void {
        this.lives--;
        this.callbacks?.onLivesChange(this.lives);
        audioManager.play('miss');

        // Reset combo on miss
        this.combo = 0;
        this.callbacks?.onComboChange(0);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    private gameOver(): void {
        this.state = GameState.GAME_OVER;
        this.callbacks?.onStateChange(this.state);
        audioManager.play('gameOver');
        audioManager.stopMusic();

        const isNewRecord = storage.setHighScore(this.score);
        this.callbacks?.onGameOver(this.score, isNewRecord);
    }

    private render(): void {
        const ctx = this.ctx;

        // Clear canvas
        ctx.clearRect(0, 0, this.width, this.height);

        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#16213e');
        gradient.addColorStop(1, '#0f0f1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw dishes
        for (const dish of this.dishes) {
            dish.render(ctx);
        }

        // Draw particles
        this.particles.render(ctx);

        // Draw slicer trail
        this.slicer.render(ctx);
    }

    get currentState(): GameState {
        return this.state;
    }

    get highScore(): number {
        return storage.highScore;
    }

    destroy(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        audioManager.stopMusic();
    }
}
