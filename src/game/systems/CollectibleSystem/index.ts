import type { System } from "@/game/SystemRunner";
import type { Game } from "@/game";
import { Container, Texture } from "pixi.js";
import { TrackSystem } from "../TrackSystem";
import { ParticleSystem } from "../ParticleSystem";
import { Collectible } from "@/game/entities/Collectible";
import { RunnerSystem } from "../RunnerSystem";
import { sound } from "@pixi/sound";
import { SeededRandom } from "@/utilities/seededRandom";

export class CollectibleSystem implements System {
    public static SYSTEM_ID = 'collectible';
    public game!: Game;

    private _container = new Container();
    private _pool: Collectible[] = [];
    private _poolSize = 48;
    private _lastProcessedSegment = -1;
    private _rnd!: SeededRandom;
    private _sparkRate = 1.6; // sparks per second per coin (increased)

    public init() {
        const rendererParent = this.game.systems.get(TrackSystem).renderer;
        rendererParent.addChild(this._container);

        const tex = Texture.from('collectible.png');

        for (let i = 0; i < this._poolSize; i++) {
            const c = new Collectible();
            c.sprite.texture = tex;
            c.clear();
            this._pool.push(c);
            this._container.addChild(c);
        }

        this._rnd = new SeededRandom(Date.now() % 1000000);
    }

    private _getFree() {
        return this._pool.find(p => !p.active) || null;
    }

    public spawnAtProgress(progress: number, side?: number | 0 | 'both') {
        const track = this.game.systems.get(TrackSystem);
        const pos = track.generator.getPositionAtProgress(progress);
        const hw = track.halfWidth;

        const placeOne = (s: number | 0) => {
            const c = this._getFree();
            if (!c) return;

            const coinHalf = (c.sprite.width || 32) * 0.5;
            const inset = 16; // keep coins inside the rails

            if (s === 0) {
                c.place(pos.x, pos.y - 24);
            } else {
                // place inside the rail by offsetting from centerline toward the side
                const offset = Math.max(32, hw - coinHalf - inset);
                c.place(pos.x + pos.nx * offset * s, pos.y + pos.ny * offset * s - 8);
            }
        };

        if (side === 'both') {
            placeOne(-1);
            placeOne(1);
        } else {
            placeOne(side ?? 0);
        }
    }

    public fixedUpdate(fixedDelta: number) {
        const track = this.game.systems.get(TrackSystem);
        const segments = track.generator.segments;
        // process any newly generated segments and spawn collectibles attached to them
        for (let i = this._lastProcessedSegment + 1; i < segments.length; i++) {
            const seg = segments[i];
            if (seg.collectible) {
                if (seg.collectible === 'both') {
                    this.spawnAtProgress(i, -1);
                    this.spawnAtProgress(i, 1);
                } else if (seg.collectible === 'left') {
                    this.spawnAtProgress(i, -1);
                } else if (seg.collectible === 'right') {
                    this.spawnAtProgress(i, 1);
                } else if (seg.collectible === 'center') {
                    this.spawnAtProgress(i, 0);
                }
            }
            this._lastProcessedSegment = i;
        }

        // idle spark chance per active collectible
        const ps = this.game.systems.get(ParticleSystem);
        for (const c of this._pool) {
            if (!c.active) continue;
            if (this._rnd.next() < this._sparkRate * fixedDelta) {
                ps?.spawnCollectSpark?.(c.xFixed, c.yFixed);
            }
        }
    }

    public update(alpha: number) {
        const runner = this.game.systems.get(RunnerSystem);
        const ball = runner.ball;

        for (const c of this._pool) {
            if (!c.active) continue;

            c.interpolate(alpha);

            // collision check against ball (simple distance)
            const dx = c.x - ball.x;
            const dy = c.y - ball.y;
            const d2 = dx * dx + dy * dy;
            const thresh = (ball.radius + (c.sprite.width * 0.5 || 16)) ** 2;
            if (d2 <= thresh) {
                c.clear();
                if (sound.exists('audio/collect.wav')) sound.play('audio/collect.wav');
                // small particle burst on collect
                const ps = this.game.systems.get(ParticleSystem);
                ps?.spawnCollectBurst?.(c.x, c.y);
            }
        }
    }

    public rebase(offsetX: number, offsetY: number) {
        for (const c of this._pool) {
            if (!c.active) continue;
            c.rebase(offsetX, offsetY);
        }
    }
}
