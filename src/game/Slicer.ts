import { Vector2, distance, sub, normalize, length } from './Physics';

interface TrailPoint {
    x: number;
    y: number;
    time: number;
}

export class Slicer {
    private trail: TrailPoint[] = [];
    private readonly trailMaxAge = 0.15; // seconds
    private readonly minSliceSpeed = 300; // pixels per second
    private isActive = false;
    private lastPosition: Vector2 | null = null;

    get currentSpeed(): number {
        if (this.trail.length < 2) return 0;

        const now = performance.now() / 1000;
        const recent = this.trail.filter(p => now - p.time < 0.05);

        if (recent.length < 2) return 0;

        const dt = recent[recent.length - 1].time - recent[0].time;
        if (dt <= 0) return 0;

        const dist = distance(
            { x: recent[0].x, y: recent[0].y },
            { x: recent[recent.length - 1].x, y: recent[recent.length - 1].y }
        );

        return dist / dt;
    }

    get canSlice(): boolean {
        return this.isActive && this.currentSpeed >= this.minSliceSpeed;
    }

    get sliceDirection(): Vector2 {
        if (this.trail.length < 2) return { x: 0, y: 1 };

        const recent = this.trail.slice(-5);
        if (recent.length < 2) return { x: 0, y: 1 };

        const dir = sub(
            { x: recent[recent.length - 1].x, y: recent[recent.length - 1].y },
            { x: recent[0].x, y: recent[0].y }
        );

        const len = length(dir);
        if (len === 0) return { x: 0, y: 1 };

        return normalize(dir);
    }

    get sliceAngle(): number {
        const dir = this.sliceDirection;
        return Math.atan2(dir.y, dir.x);
    }

    startSlice(x: number, y: number): void {
        this.isActive = true;
        this.trail = [];
        this.addPoint(x, y);
        this.lastPosition = { x, y };
    }

    moveSlice(x: number, y: number): void {
        if (!this.isActive) return;
        this.addPoint(x, y);
        this.lastPosition = { x, y };
    }

    endSlice(): void {
        this.isActive = false;
    }

    private addPoint(x: number, y: number): void {
        const time = performance.now() / 1000;
        this.trail.push({ x, y, time });
    }

    update(): void {
        const now = performance.now() / 1000;

        // Remove old trail points
        this.trail = this.trail.filter(p => now - p.time < this.trailMaxAge);
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.trail.length < 2) return;

        const now = performance.now() / 1000;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw trail with gradient
        for (let i = 1; i < this.trail.length; i++) {
            const p0 = this.trail[i - 1];
            const p1 = this.trail[i];

            const age0 = now - p0.time;
            const age1 = now - p1.time;

            const alpha0 = Math.max(0, 1 - age0 / this.trailMaxAge);
            const alpha1 = Math.max(0, 1 - age1 / this.trailMaxAge);

            const width0 = 2 + alpha0 * 20;
            const width1 = 2 + alpha1 * 20;

            // Create gradient for this segment
            const gradient = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
            gradient.addColorStop(0, `rgba(255, 107, 53, ${alpha0})`);
            gradient.addColorStop(1, `rgba(247, 147, 30, ${alpha1})`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = (width0 + width1) / 2;

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        }

        // Draw glow for recent trail
        if (this.isActive && this.trail.length > 0) {
            const last = this.trail[this.trail.length - 1];
            const alpha = 0.5;

            ctx.shadowColor = 'rgba(255, 107, 53, 0.8)';
            ctx.shadowBlur = 20;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

            ctx.beginPath();
            ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getRecentPoints(): Vector2[] {
        const now = performance.now() / 1000;
        return this.trail
            .filter(p => now - p.time < 0.03)
            .map(p => ({ x: p.x, y: p.y }));
    }
}
