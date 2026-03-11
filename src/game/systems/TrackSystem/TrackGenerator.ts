import { SeededRandom } from "@/utilities/seededRandom";
import type { PointData } from "pixi.js";
import { catmullRom, catmullRomTangent } from "@/utilities/math";

type TrackSegment = {
    gapLeft: boolean;
    gapRight: boolean;
    collectible?: 'left' | 'right' | 'center' | 'both' | null;
}

type TrackGenConfig = Partial<{
    ySpacingMin: number;
    ySpacingMax: number;
    xWanderMax: number;
    xMin: number;
    xMax: number;
}>

const defaults: Required<TrackGenConfig> = {
    ySpacingMin: 350,
    ySpacingMax: 450,
    xWanderMax: 100,
    xMin: 150,
    xMax: 570,
}

export class TrackGenerator {
    public readonly rng: SeededRandom;
    private _points: PointData[] = [];
    private _segments: TrackSegment[] = [];
    private _gapCooldown = 5;
    private _gapProbability = 0.15;
    private _gapMinCooldown = 3;
    private _collectibleCooldown = 0;
    private _collectibleProbability = 0.7;
    private _collectibleMinCooldown = 1;

    private _config: Required<TrackGenConfig>;

    constructor(seed: number, config: TrackGenConfig = {}) {
        this.rng = new SeededRandom(seed);
        this._config = { ...defaults, ...config };

        for(let i = 0; i < 15; i++) {
            this.generateNext();
        }
    }

    get points() {
        return this._points;
    }

    get segments() {
        return this._segments;
    }

    public generateNext() {
        const { xMin, xMax, ySpacingMin, ySpacingMax, xWanderMax } = this._config;
        const lastPoint = this._points.length > 0 ? this._points[this._points.length - 1] : { x: (xMin + xMax) / 2 , y: 1280 };

        const newX = Math.max(xMin, Math.min(xMax, lastPoint.x + this.rng.nextRange(-xWanderMax, xWanderMax)));
        const newY = lastPoint.y - this.rng.nextRange(ySpacingMin, ySpacingMax);

        this._points.push({ x: newX, y: newY });

        const segment: TrackSegment = {
            gapLeft: false,
            gapRight: false,
            collectible: null,
        };

        if(this._gapCooldown > 0) {
            this._gapCooldown--;
        } else if(this.rng.next() < this._gapProbability) {
            if(this.rng.next() < 0.5) {
                segment.gapLeft = true;
            } else {
                segment.gapRight = true;
            }
            this._gapCooldown = this._gapMinCooldown;
        }

            if (this._collectibleCooldown > 0) {
            this._collectibleCooldown--;
        } else if (this.rng.next() < this._collectibleProbability) {
            const r = this.rng.next();
            if (r < 0.12) {
                segment.collectible = 'both';
            } else if (r < 0.66) {
                segment.collectible = this.rng.next() < 0.5 ? 'left' : 'right';
                this.rng.next();
            } else {
                segment.collectible = 'center';
            }

            this._collectibleCooldown = this._collectibleMinCooldown;
        }

        this._segments.push(segment);
    }

    public setGapConfig(probability: number, minCooldown: number) {
        this._gapProbability = probability;
        this._gapMinCooldown = minCooldown;
    }

    public getSegmentAt(progress: number): TrackSegment {
        const segIndex = Math.max(0, Math.min(Math.floor(progress), this._segments.length - 1));
        return this._segments[segIndex];
    }

    public getPositionAtProgress(progress: number) {
        const seg = Math.max(0, Math.min(Math.floor(progress), this._points.length - 2));
        const t = progress - seg;

        const p0 = this._points[Math.max(0, seg - 1)];
        const p1 = this._points[seg];
        const p2 = this._points[Math.min(this._points.length - 1, seg + 1)];
        const p3 = this._points[Math.min(this._points.length - 1, seg + 2)];

        const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
        const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);

        const tx = catmullRomTangent(p0.x, p1.x, p2.x, p3.x, t);
        const ty = catmullRomTangent(p0.y, p1.y, p2.y, p3.y, t);
        const len = Math.sqrt(tx * tx + ty * ty);
        const nx = -ty / len;
        const ny = tx / len;

        return { x, y, nx, ny, tangentLength: len };
    }

    public getSegmentArcLength(seg: number, steps = 10): number {
        seg = Math.max(0, Math.min(seg, this._points.length - 2));

        const p0 = this._points[Math.max(0, seg - 1)];
        const p1 = this._points[seg];
        const p2 = this._points[Math.min(this._points.length - 1, seg + 1)];
        const p3 = this._points[Math.min(this._points.length - 1, seg + 2)];

        let length = 0;
        let prevX = p1.x;
        let prevY = p1.y;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
            const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
            const dx = x - prevX;
            const dy = y - prevY;
            length += Math.sqrt(dx * dx + dy * dy);
            prevX = x;
            prevY = y;
        }

        return length;
    }

    public rebase(offsetX: number, offsetY: number) {
        for (const point of this._points) {
            point.x -= offsetX;
            point.y -= offsetY;
        }
    }
}