import type { Game } from "@/game";
import type { System } from "@/game/SystemRunner";
import { TrackSystem } from "./TrackSystem";
import { RunnerSystem } from "./RunnerSystem";
import { Container, Sprite, Texture } from "pixi.js";
import { SeededRandom } from "@/utilities/seededRandom";

const SPARK_SPAWN_LEAD = 4.5;
const SPARK_SPEED = 0.4;
const SPARK_HIT_PADDING = 20;
const MIN_TOTAL_PROGRESS = 20;
const POOL_SIZE = 4;
const TRAIL_POOL_SIZE = 96;

type SparkRecord = {
    active: boolean;
    hitChecked: boolean;
    progress: number;
    side: number;
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

export class SparkSystem implements System {
    public static SYSTEM_ID = 'spark';
    public game!: Game;

    private _container = new Container();
    private _sparks: SparkRecord[] = [];
    private _trail: TrailParticle[] = [];
    private _spawnTimer = 2.0;
    private _time = 0;
    private _rng = new SeededRandom(Date.now());

    public init() {
        const trackRenderer = this.game.systems.get(TrackSystem).renderer;
        trackRenderer.addChild(this._container);

        const sparkTexture = Texture.from('particle.png');
        const trailTexture = Texture.from('white.png');

        for (let i = 0; i < POOL_SIZE; i++) {
            const container = new Container();

            const glowSprite = new Sprite(sparkTexture);
            glowSprite.anchor.set(0.5);
            glowSprite.scale.set(6);
            glowSprite.tint = 0xff6600;
            glowSprite.alpha = 0.4;

            const coreSprite = new Sprite(sparkTexture);
            coreSprite.anchor.set(0.5);
            coreSprite.scale.set(2.5);
            coreSprite.tint = 0xffff88;

            container.addChild(glowSprite, coreSprite);
            container.visible = false;
            this._container.addChild(container);

            this._sparks.push({
                active: false,
                hitChecked: false,
                progress: 0,
                side: 1,
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
        this._spawnTimer = 2.0;
    }

    public update(alpha: number) {
        const pulse = Math.sin(this._time * 12) * 0.12;

        for (const spark of this._sparks) {
            if (!spark.active) continue;
            spark.container.x = spark.prevX + (spark.x - spark.prevX) * alpha;
            spark.container.y = spark.prevY + (spark.y - spark.prevY) * alpha;
            spark.glowSprite.alpha = 0.4 + pulse;
            spark.glowSprite.scale.set(6 + pulse * 3);
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
            p.vy += 320 * fixedDelta;
            p.life -= fixedDelta;

            const t = 1 - p.life / p.maxLife;
            p.sprite.alpha = 1 - t;
            p.sprite.scale.set(2 * (1 - t * 0.7));

            if (p.life <= 0) {
                p.active = false;
                p.sprite.visible = false;
            }
        }

        for (const spark of this._sparks) {
            if (!spark.active) continue;

            spark.prevX = spark.x;
            spark.prevY = spark.y;
            spark.progress -= SPARK_SPEED * fixedDelta;

            const pos = track.generator.getPositionAtProgress(spark.progress);
            const hw = track.halfWidth;
            spark.x = pos.x + pos.nx * hw * spark.side;
            spark.y = pos.y + pos.ny * hw * spark.side;

            this._emitTrail(spark);

            const dist = spark.progress - runner.progress;

            if (!spark.hitChecked) {
                const dx = spark.x - runner.ball.fixedX;
                const dy = spark.y - runner.ball.fixedY;
                const hitRadius = runner.ball.radius + SPARK_HIT_PADDING;
                if (dx * dx + dy * dy < hitRadius * hitRadius) {
                    spark.hitChecked = true;
                    if (isRunning) {
                        runner.beginImpactDeath(pos);
                        this._deactivate(spark);
                        continue;
                    }
                }
            }

            if (dist < -1.5) {
                this._deactivate(spark);
            }
        }

        if (!isRunning || runner.totalProgress < MIN_TOTAL_PROGRESS) return;

        this._spawnTimer -= fixedDelta;
        if (this._spawnTimer <= 0) {
            this._trySpawn(runner, track);
            const t = 1 - Math.exp(-(runner.totalProgress - MIN_TOTAL_PROGRESS) / 150);
            this._spawnTimer = 4.5 - 2.5 * t;
        }
    }

    private _emitTrail(spark: SparkRecord) {
        const p = this._trail.find(t => !t.active);
        if (!p) return;

        p.active = true;
        p.x = spark.x + this._rng.nextRange(-5, 5);
        p.y = spark.y + this._rng.nextRange(-5, 5);
        p.prevX = p.x;
        p.prevY = p.y;
        p.vx = this._rng.nextRange(-60, 60);
        p.vy = -this._rng.nextRange(60, 160);
        p.maxLife = this._rng.nextRange(0.14, 0.26);
        p.life = p.maxLife;
        p.sprite.tint = this._rng.next() < 0.5 ? 0xffdd00 : 0xff8800;
        p.sprite.scale.set(2);
        p.sprite.alpha = 1;
        p.sprite.visible = true;
    }

    private _trySpawn(runner: RunnerSystem, track: TrackSystem) {
        const spark = this._sparks.find(s => !s.active);
        if (!spark) return;

        const side = this._rng.next() < 0.5 ? 1 : -1;
        const progress = runner.progress + SPARK_SPAWN_LEAD;
        const pos = track.generator.getPositionAtProgress(progress);
        const hw = track.halfWidth;

        spark.active = true;
        spark.hitChecked = false;
        spark.side = side;
        spark.progress = progress;
        spark.x = pos.x + pos.nx * hw * side;
        spark.y = pos.y + pos.ny * hw * side;
        spark.prevX = spark.x;
        spark.prevY = spark.y;
        spark.container.visible = true;
    }

    private _deactivate(spark: SparkRecord) {
        spark.active = false;
        spark.container.visible = false;
    }

    public adjustProgress(delta: number) {
        for (const spark of this._sparks) {
            if (spark.active) spark.progress += delta;
        }
    }

    public end() {
        this._resetAll();
    }

    public reset() {
        this._spawnTimer = 2.0;
        this._time = 0;
        this._resetAll();
    }

    public rebase(offsetX: number, offsetY: number) {
        for (const spark of this._sparks) {
            if (!spark.active) continue;
            spark.prevX -= offsetX;
            spark.prevY -= offsetY;
            spark.x -= offsetX;
            spark.y -= offsetY;
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
        for (const spark of this._sparks) {
            this._deactivate(spark);
        }
        for (const p of this._trail) {
            p.active = false;
            p.sprite.visible = false;
        }
    }
}
