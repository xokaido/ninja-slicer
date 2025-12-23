import { Vector2, randomRange, randomInt } from './Physics';

export enum DishType {
    PIZZA = 'pizza',
    BURGER = 'burger',
    SUSHI = 'sushi',
    DONUT = 'donut',
    TACO = 'taco',
    HOTDOG = 'hotdog',
}

interface DishConfig {
    emoji: string;
    color: string;
    points: number;
}

const DISH_CONFIGS: Record<DishType, DishConfig> = {
    [DishType.PIZZA]: { emoji: '🍕', color: '#ff6b35', points: 10 },
    [DishType.BURGER]: { emoji: '🍔', color: '#8b4513', points: 15 },
    [DishType.SUSHI]: { emoji: '🍣', color: '#ff69b4', points: 20 },
    [DishType.DONUT]: { emoji: '🍩', color: '#ff85a2', points: 12 },
    [DishType.TACO]: { emoji: '🌮', color: '#f4a460', points: 18 },
    [DishType.HOTDOG]: { emoji: '🌭', color: '#daa520', points: 8 },
};

export class Dish {
    public position: Vector2;
    public velocity: Vector2;
    public rotation: number = 0;
    public rotationSpeed: number;
    public size: number;
    public type: DishType;
    public isSliced: boolean = false;
    public sliceAngle: number = 0;
    public halfVelocity1: Vector2 = { x: 0, y: 0 };
    public halfVelocity2: Vector2 = { x: 0, y: 0 };
    public sliceOffset: number = 0;
    public alpha: number = 1;

    private config: DishConfig;

    constructor(x: number, y: number, vx: number, vy: number, type?: DishType) {
        this.position = { x, y };
        this.velocity = { x: vx, y: vy };
        this.rotationSpeed = randomRange(-5, 5);
        this.size = randomRange(60, 90);
        this.type = type || this.getRandomType();
        this.config = DISH_CONFIGS[this.type];
    }

    private getRandomType(): DishType {
        const types = Object.values(DishType);
        return types[randomInt(0, types.length - 1)];
    }

    get emoji(): string {
        return this.config.emoji;
    }

    get color(): string {
        return this.config.color;
    }

    get points(): number {
        return this.config.points;
    }

    slice(angle: number): void {
        if (this.isSliced) return;

        this.isSliced = true;
        this.sliceAngle = angle;

        // Calculate velocities for the two halves
        const perpX = Math.cos(angle + Math.PI / 2);
        const perpY = Math.sin(angle + Math.PI / 2);
        const splitSpeed = 150;

        this.halfVelocity1 = {
            x: this.velocity.x + perpX * splitSpeed,
            y: this.velocity.y + perpY * splitSpeed - 100,
        };

        this.halfVelocity2 = {
            x: this.velocity.x - perpX * splitSpeed,
            y: this.velocity.y - perpY * splitSpeed - 100,
        };
    }

    update(dt: number, gravity: number): void {
        if (this.isSliced) {
            // Update both halves
            this.halfVelocity1.y += gravity * dt;
            this.halfVelocity2.y += gravity * dt;
            this.sliceOffset += 200 * dt;
            this.alpha -= dt * 0.5;

            // Use average velocity for position
            this.position.x += (this.halfVelocity1.x + this.halfVelocity2.x) / 2 * dt;
            this.position.y += (this.halfVelocity1.y + this.halfVelocity2.y) / 2 * dt;
        } else {
            this.velocity.y += gravity * dt;
            this.position.x += this.velocity.x * dt;
            this.position.y += this.velocity.y * dt;
        }

        this.rotation += this.rotationSpeed * dt;
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);

        if (this.isSliced) {
            // Render two halves
            this.renderHalf(ctx, -this.sliceOffset, true);
            this.renderHalf(ctx, this.sliceOffset, false);
        } else {
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(this.rotation);
            ctx.font = `${this.size}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff'; // Ensure visibility if monochrome
            ctx.fillText(this.emoji, 0, 0);
        }

        ctx.restore();
    }

    private renderHalf(ctx: CanvasRenderingContext2D, offset: number, isFirst: boolean): void {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.sliceAngle);
        ctx.translate(offset, 0);
        ctx.rotate(this.rotation - this.sliceAngle);

        // Clip to show only half
        ctx.beginPath();
        if (isFirst) {
            ctx.rect(-this.size, -this.size, this.size, this.size * 2);
        } else {
            ctx.rect(0, -this.size, this.size, this.size * 2);
        }
        ctx.clip();

        ctx.font = `${this.size}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff'; // Ensure visibility if monochrome
        ctx.fillText(this.emoji, 0, 0);

        ctx.restore();
    }

    isOffScreen(screenHeight: number): boolean {
        return this.position.y > screenHeight + this.size;
    }

    containsPoint(x: number, y: number): boolean {
        if (this.isSliced) return false;
        const dx = x - this.position.x;
        const dy = y - this.position.y;
        const radius = this.size / 2;
        return dx * dx + dy * dy < radius * radius;
    }
}

export function createRandomDish(screenWidth: number, screenHeight: number): Dish {
    // Spawn from bottom, random x position
    const x = randomRange(screenWidth * 0.15, screenWidth * 0.85);
    const y = screenHeight + 50;

    // Launch upward with some horizontal velocity toward center
    const targetX = screenWidth / 2 + randomRange(-100, 100);
    const angle = Math.atan2(-screenHeight * 0.7, targetX - x);
    const speed = randomRange(700, 1000);

    const vx = Math.cos(angle) * speed + randomRange(-100, 100);
    const vy = Math.sin(angle) * speed;

    return new Dish(x, y, vx, vy);
}
