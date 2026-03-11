import type { Game } from "@/game";
import type { System } from "@/game/SystemRunner";
import type { SeededRandom } from "@/utilities/seededRandom";
import { TrackSystem } from "./TrackSystem";
import { RunnerSystem } from "./RunnerSystem";
import { Container, Sprite, Texture } from "pixi.js";

export type HazardConfig = {
    spawnLead: number;
    speed: number;
    hitPadding: number;
    minTotalProgress: number;
    poolSize: number;
    trailPoolSize: number;
    initialSpawnTimer: number;
    spawnTimerRange: [max: number, min: number];
    spawnTimerDecay: number;
    glowTint: number;
    glowScale: number;
    glowAlpha: number;
    coreTint: number;
    coreScale: number;
    pulseSpeed: number;
    pulseAmplitude: number;
    pulseSizeScale: number;
    trailGravity: number;
    trailSpreadXY: [number, number];
    trailVxRange: [number, number];
    trailVyRange: [number, number];
    trailLifeRange: [number, number];
    trailTints: [number, number];
    positionOnTrack: (
        pos: { x: number; y: number; nx: number; ny: number },
        hw: number,
        side: number,
    ) => { x: number; y: number };
    pickSide: (rng: SeededRandom) => number;
};

type HazardRecord = {
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

export abstract class HazardSystem implements System {
    public game!: Game;

    protected abstract readonly _config: HazardConfig;

    private _container = new Container();
    private _hazards: HazardRecord[] = [];
    private _trail: TrailParticle[] = [];
    private _spawnTimer = 0;
    private _time = 0;

    public init() {
        const trackRenderer = this.game.systems.get(TrackSystem).renderer;
        trackRenderer.addChild(this._container);

        const hazardTexture = Texture.from('particle.png');
        const trailTexture = Texture.from('white.png');

        for (let i = 0; i < this._config.poolSize; i++) {
            const container = new Container();

            const glowSprite = new Sprite(hazardTexture);
            glowSprite.anchor.set(0.5);
            glowSprite.scale.set(this._config.glowScale);
            glowSprite.tint = this._config.glowTint;
            glowSprite.alpha = this._config.glowAlpha;

            const coreSprite = new Sprite(hazardTexture);
            coreSprite.anchor.set(0.5);
            coreSprite.scale.set(this._config.coreScale);
            coreSprite.tint = this._config.coreTint;

            container.addChild(glowSprite, coreSprite);
            container.visible = false;
            this._container.addChild(container);

            this._hazards.push({
                active: false,
                hitChecked: false,
                progress: 0,
                side: 1,
                x: 0, y: 0, prevX: 0, prevY: 0,
                container, glowSprite, coreSprite,
            });
        }

        for (let i = 0; i < this._config.trailPoolSize; i++) {
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
        this._spawnTimer = this._config.initialSpawnTimer;
    }

    public update(alpha: number) {
        const cfg = this._config;
        const pulse = Math.sin(this._time * cfg.pulseSpeed) * cfg.pulseAmplitude;

        for (const h of this._hazards) {
            if (!h.active) continue;
            h.container.x = h.prevX + (h.x - h.prevX) * alpha;
            h.container.y = h.prevY + (h.y - h.prevY) * alpha;
            h.glowSprite.alpha = cfg.glowAlpha + pulse;
            h.glowSprite.scale.set(cfg.glowScale + pulse * cfg.pulseSizeScale);
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
        const cfg = this._config;
        const isRunning = runner.countdownLabel === null && !runner.isDead;

        this._time += fixedDelta;

        for (const p of this._trail) {
            if (!p.active) continue;

            p.prevX = p.x;
            p.prevY = p.y;
            p.x += p.vx * fixedDelta;
            p.y += p.vy * fixedDelta;
            p.vy += cfg.trailGravity * fixedDelta;
            p.life -= fixedDelta;

            const t = 1 - p.life / p.maxLife;
            p.sprite.alpha = 1 - t;
            p.sprite.scale.set(2 * (1 - t * 0.7));

            if (p.life <= 0) {
                p.active = false;
                p.sprite.visible = false;
            }
        }

        for (const h of this._hazards) {
            if (!h.active) continue;

            h.prevX = h.x;
            h.prevY = h.y;
            h.progress -= cfg.speed * fixedDelta;

            const pos = track.generator.getPositionAtProgress(h.progress);
            const placed = cfg.positionOnTrack(pos, track.halfWidth, h.side);
            h.x = placed.x;
            h.y = placed.y;

            this._emitTrail(h);

            if (!h.hitChecked) {
                const dx = h.x - runner.ball.fixedX;
                const dy = h.y - runner.ball.fixedY;
                const hitRadius = runner.ball.radius + cfg.hitPadding;
                if (dx * dx + dy * dy < hitRadius * hitRadius) {
                    h.hitChecked = true;
                    if (isRunning) {
                        runner.beginImpactDeath(pos);
                        this._deactivate(h);
                        continue;
                    }
                }
            }

            if (h.progress - runner.progress < -1.5) {
                this._deactivate(h);
            }
        }

        if (!isRunning || runner.totalProgress < cfg.minTotalProgress) return;

        this._spawnTimer -= fixedDelta;
        if (this._spawnTimer <= 0) {
            this._trySpawn(runner, track);
            const t = 1 - Math.exp(-(runner.totalProgress - cfg.minTotalProgress) / cfg.spawnTimerDecay);
            this._spawnTimer = cfg.spawnTimerRange[0] - (cfg.spawnTimerRange[0] - cfg.spawnTimerRange[1]) * t;
        }
    }

    private _emitTrail(h: HazardRecord) {
        const p = this._trail.find(t => !t.active);
        if (!p) return;

        const rng = this.game.rng;
        const cfg = this._config;
        const [sx, sy] = cfg.trailSpreadXY;

        p.active = true;
        p.x = h.x + rng.nextRange(-sx, sx);
        p.y = h.y + rng.nextRange(-sy, sy);
        p.prevX = p.x;
        p.prevY = p.y;
        p.vx = rng.nextRange(cfg.trailVxRange[0], cfg.trailVxRange[1]);
        p.vy = -rng.nextRange(cfg.trailVyRange[0], cfg.trailVyRange[1]);
        p.maxLife = rng.nextRange(cfg.trailLifeRange[0], cfg.trailLifeRange[1]);
        p.life = p.maxLife;
        p.sprite.tint = rng.next() < 0.5 ? cfg.trailTints[0] : cfg.trailTints[1];
        p.sprite.scale.set(2);
        p.sprite.alpha = 1;
        p.sprite.visible = true;
    }

    private _trySpawn(runner: RunnerSystem, track: TrackSystem) {
        const h = this._hazards.find(s => !s.active);
        if (!h) return;

        const cfg = this._config;
        const side = cfg.pickSide(this.game.rng);
        const progress = runner.progress + cfg.spawnLead;
        const pos = track.generator.getPositionAtProgress(progress);
        const placed = cfg.positionOnTrack(pos, track.halfWidth, side);

        h.active = true;
        h.hitChecked = false;
        h.side = side;
        h.progress = progress;
        h.x = placed.x;
        h.y = placed.y;
        h.prevX = h.x;
        h.prevY = h.y;
        h.container.visible = true;
    }

    private _deactivate(h: HazardRecord) {
        h.active = false;
        h.container.visible = false;
    }

    public adjustProgress(delta: number) {
        for (const h of this._hazards) {
            if (h.active) h.progress += delta;
        }
    }

    public end() {
        this._resetAll();
    }

    public reset() {
        this._spawnTimer = this._config.initialSpawnTimer;
        this._time = 0;
        this._resetAll();
    }

    public rebase(offsetX: number, offsetY: number) {
        for (const h of this._hazards) {
            if (!h.active) continue;
            h.prevX -= offsetX;
            h.prevY -= offsetY;
            h.x -= offsetX;
            h.y -= offsetY;
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
        for (const h of this._hazards) {
            this._deactivate(h);
        }
        for (const p of this._trail) {
            p.active = false;
            p.sprite.visible = false;
        }
    }
}
