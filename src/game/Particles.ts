import { Vector2, randomRange } from './Physics';

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
    rotation: number;
    rotationSpeed: number;
}

export class ParticleSystem {
    private particles: Particle[] = [];
    private readonly gravity = 800;

    emit(position: Vector2, color: string, count: number = 10): void {
        for (let i = 0; i < count; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(100, 400);

            this.particles.push({
                x: position.x,
                y: position.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                size: randomRange(4, 12),
                color,
                life: 1,
                maxLife: randomRange(0.5, 1),
                rotation: randomRange(0, Math.PI * 2),
                rotationSpeed: randomRange(-10, 10),
            });
        }
    }

    emitTrail(position: Vector2, color: string): void {
        this.particles.push({
            x: position.x + randomRange(-5, 5),
            y: position.y + randomRange(-5, 5),
            vx: randomRange(-20, 20),
            vy: randomRange(-20, 20),
            size: randomRange(2, 6),
            color,
            life: 1,
            maxLife: 0.3,
            rotation: 0,
            rotationSpeed: 0,
        });
    }

    update(dt: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.vy += this.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rotation += p.rotationSpeed * dt;
            p.life -= dt / p.maxLife;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        for (const p of this.particles) {
            const alpha = Math.max(0, p.life);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            // Draw particle as rounded square
            const halfSize = p.size / 2;
            ctx.beginPath();
            ctx.roundRect(-halfSize, -halfSize, p.size, p.size, 2);
            ctx.fill();

            ctx.restore();
        }

        ctx.restore();
    }

    clear(): void {
        this.particles = [];
    }
}
