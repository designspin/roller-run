import type { Game } from "@/game";
import type { System } from "@/game/SystemRunner";
import { TrackSystem } from "./TrackSystem";
import { RunnerSystem } from "./RunnerSystem";
import { Container, Sprite, Texture } from "pixi.js";
import { SeededRandom } from "@/utilities/seededRandom";

const BLOCKER_SPAWN_LEAD = 5.0;
const BLOCKER_SPEED = 0.5;
const BLOCKER_HIT_PADDING = 30;
const MIN_TOTAL_PROGRESS = 50;
const POOL_SIZE = 3;
const TRAIL_POOL_SIZE = 60;

type BlockerRecord = {
    active: boolean;
    hitChecked: boolean;
    progress: number;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    container: Container;
    glowSprite: Sprite;
    coreSprite: Sprite;
};

type TrailParticle = {
    active: boolean;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    sprite: Sprite;
};

export class BlockerSystem implements System {
    public static SYSTEM_ID = 'blocker';
    public game!: Game;

    private _container = new Container();
    private _blockers: BlockerRecord[] = [];
    private _trail: TrailParticle[] = [];
    private _spawnTimer = 3.0;
    private _time = 0;
    private _rng = new SeededRandom(Date.now() ^ 0xdeadbeef);

    public init() {
        const trackRenderer = this.game.systems.get(TrackSystem).renderer;
        trackRenderer.addChild(this._container);

        const orbTexture = Texture.from('particle.png');
        const trailTexture = Texture.from('white.png');

        for (let i = 0; i < POOL_SIZE; i++) {
            const container = new Container();

            const glowSprite = new Sprite(orbTexture);
            glowSprite.anchor.set(0.5);
            glowSprite.scale.set(8);
            glowSprite.tint = 0x00aaff;
            glowSprite.alpha = 0.3;

            const coreSprite = new Sprite(orbTexture);
            coreSprite.anchor.set(0.5);
            coreSprite.scale.set(3);
            coreSprite.tint = 0x88eeff;

            container.addChild(glowSprite, coreSprite);
            container.visible = false;
            this._container.addChild(container);

            this._blockers.push({
                active: false,
                hitChecked: false,
                progress: 0,
                x: 0, y: 0, prevX: 0, prevY: 0,
                container, glowSprite, coreSprite,
            });
        }

        for (let i = 0; i < TRAIL_POOL_SIZE; i++) {
            const sprite = new Sprite(trailTexture);
            sprite.anchor.set(0.5);
            sprite.visible = false;
            this._container.addChild(sprite);

            this._trail.push({
                active: false,
                x: 0, y: 0, prevX: 0, prevY: 0,
                vx: 0, vy: 0,
                life: 0, maxLife: 1,
                sprite,
            });
        }
    }

    public start() {
        this._spawnTimer = 3.0;
    }

    public update(alpha: number) {
        const pulse = Math.sin(this._time * 10) * 0.1;

        for (const blocker of this._blockers) {
            if (!blocker.active) continue;
            blocker.container.x = blocker.prevX + (blocker.x - blocker.prevX) * alpha;
            blocker.container.y = blocker.prevY + (blocker.y - blocker.prevY) * alpha;
            blocker.glowSprite.alpha = 0.3 + pulse;
            blocker.glowSprite.scale.set(8 + pulse * 4);
        }

        for (const p of this._trail) {
            if (!p.active) continue;
            p.sprite.x = p.prevX + (p.x - p.prevX) * alpha;
            p.sprite.y = p.prevY + (p.y - p.prevY) * alpha;
        }
    }

    public fixedUpdate(fixedDelta: number) {
        const runner = this.game.systems.get(RunnerSystem);
        const track = this.game.systems.get(TrackSystem);
        const isRunning = runner.countdownLabel === null && !runner.isDead;

        this._time += fixedDelta;

        for (const p of this._trail) {
            if (!p.active) continue;

            p.prevX = p.x;
            p.prevY = p.y;
            p.x += p.vx * fixedDelta;
            p.y += p.vy * fixedDelta;
            p.vy += 280 * fixedDelta;
            p.life -= fixedDelta;

            const t = 1 - p.life / p.maxLife;
            p.sprite.alpha = 1 - t;
            p.sprite.scale.set(2 * (1 - t * 0.7));

            if (p.life <= 0) {
                p.active = false;
                p.sprite.visible = false;
            }
        }

        for (const blocker of this._blockers) {
            if (!blocker.active) continue;

            blocker.prevX = blocker.x;
            blocker.prevY = blocker.y;
            blocker.progress -= BLOCKER_SPEED * fixedDelta;

            const pos = track.generator.getPositionAtProgress(blocker.progress);
            blocker.x = pos.x;
            blocker.y = pos.y;

            this._emitTrail(blocker);

            const dist = blocker.progress - runner.progress;

            if (!blocker.hitChecked) {
                const dx = blocker.x - runner.ball.fixedX;
                const dy = blocker.y - runner.ball.fixedY;
                const hitRadius = runner.ball.radius + BLOCKER_HIT_PADDING;
                if (dx * dx + dy * dy < hitRadius * hitRadius) {
                    blocker.hitChecked = true;
                    if (isRunning) {
                        runner.beginImpactDeath(pos);
                        this._deactivate(blocker);
                        continue;
                    }
                }
            }

            if (dist < -1.5) {
                this._deactivate(blocker);
            }
        }

        if (!isRunning || runner.totalProgress < MIN_TOTAL_PROGRESS) return;

        this._spawnTimer -= fixedDelta;
        if (this._spawnTimer <= 0) {
            this._trySpawn(runner, track);
            const t = 1 - Math.exp(-(runner.totalProgress - MIN_TOTAL_PROGRESS) / 200);
            this._spawnTimer = 6.0 - 3.0 * t;
        }
    }

    private _emitTrail(blocker: BlockerRecord) {
        const p = this._trail.find(t => !t.active);
        if (!p) return;

        p.active = true;
        p.x = blocker.x + this._rng.nextRange(-8, 8);
        p.y = blocker.y + this._rng.nextRange(-8, 8);
        p.prevX = p.x;
        p.prevY = p.y;
        p.vx = this._rng.nextRange(-40, 40);
        p.vy = -this._rng.nextRange(40, 120);
        p.maxLife = this._rng.nextRange(0.18, 0.32);
        p.life = p.maxLife;
        p.sprite.tint = this._rng.next() < 0.5 ? 0x00ddff : 0x0088ff;
        p.sprite.scale.set(2);
        p.sprite.alpha = 1;
        p.sprite.visible = true;
    }

    private _trySpawn(runner: RunnerSystem, track: TrackSystem) {
        const blocker = this._blockers.find(b => !b.active);
        if (!blocker) return;

        const progress = runner.progress + BLOCKER_SPAWN_LEAD;
        const pos = track.generator.getPositionAtProgress(progress);

        blocker.active = true;
        blocker.hitChecked = false;
        blocker.progress = progress;
        blocker.x = pos.x;
        blocker.y = pos.y;
        blocker.prevX = blocker.x;
        blocker.prevY = blocker.y;
        blocker.container.visible = true;
    }

    private _deactivate(blocker: BlockerRecord) {
        blocker.active = false;
        blocker.container.visible = false;
    }

    public adjustProgress(delta: number) {
        for (const blocker of this._blockers) {
            if (blocker.active) blocker.progress += delta;
        }
    }

    public end() {
        this._resetAll();
    }

    public reset() {
        this._spawnTimer = 3.0;
        this._time = 0;
        this._resetAll();
    }

    public rebase(offsetX: number, offsetY: number) {
        for (const blocker of this._blockers) {
            if (!blocker.active) continue;
            blocker.prevX -= offsetX;
            blocker.prevY -= offsetY;
            blocker.x -= offsetX;
            blocker.y -= offsetY;
        }

        for (const p of this._trail) {
            if (!p.active) continue;
            p.prevX -= offsetX;
            p.prevY -= offsetY;
            p.x -= offsetX;
            p.y -= offsetY;
        }
    }

    private _resetAll() {
        for (const blocker of this._blockers) {
            this._deactivate(blocker);
        }
        for (const p of this._trail) {
            p.active = false;
            p.sprite.visible = false;
        }
    }
}
