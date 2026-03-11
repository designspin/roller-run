import type { Game } from "@/game";
import type { System } from "@/game/SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { Container, Sprite, Texture } from "pixi.js";
import { createParticleRecord, resetParticle, type ParticleRecord } from "./ParticleRecord";

export class ParticleSystem implements System {
    public static SYSTEM_ID = 'particle';
    public game!: Game;

    private _container: Container = new Container();
    private _particles: ParticleRecord[] = [];
    private _poolSize = 96;

    private _gravity = 520;
    private _drag = 0.992;

    private _getFreeParticle(): ParticleRecord | null {
        return this._particles.find(p => !p.active) || null;
    }

    public spawnCollectBurst(x: number, y: number) {
        const particleCount = 12;
        const rnd = this.game.rng;
        const tintChoices = [0xffd86b, 0xffe59a, 0xffc84b];

        for (let i = 0; i < particleCount; i++) {
            const particle = this._getFreeParticle();
            if (!particle) break;

            particle.active = true;
            particle.sprite.visible = true;
            particle.x = x + rnd.nextRange(-6, 6);
            particle.y = y + rnd.nextRange(-6, 6);
            particle.prevX = particle.x;
            particle.prevY = particle.y;
            particle.maxLife = rnd.nextRange(0.28, 0.6);
            particle.life = particle.maxLife;
            const speed = rnd.nextRange(80, 240);
            const angle = rnd.nextRange(-Math.PI, Math.PI);
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed - rnd.nextRange(40, 120);
            particle.rotation = rnd.nextRange(-Math.PI, Math.PI);
            particle.spin = rnd.nextRange(-6, 6);
            particle.startScale = rnd.nextRange(0.6, 1.2);
            particle.endScale = 0.12;
            particle.startAlpha = 1;
            particle.endAlpha = 0;
            particle.tint = rnd.choose(tintChoices);
            particle.sprite.alpha = particle.startAlpha;
            particle.sprite.scale.set(particle.startScale);
            particle.sprite.rotation = particle.rotation;
            particle.sprite.tint = particle.tint;
        }
    }

    public spawnCollectSpark(x: number, y: number) {
        const rnd = this.game.rng;
        const particle = this._getFreeParticle();
        if (!particle) return;

        particle.active = true;
        particle.sprite.visible = true;
        particle.x = x + rnd.nextRange(-3, 3);
        particle.y = y + rnd.nextRange(-3, 3);
        particle.prevX = particle.x;
        particle.prevY = particle.y;
        particle.maxLife = rnd.nextRange(0.18, 0.36);
        particle.life = particle.maxLife;
        const speed = rnd.nextRange(30, 120);
        const angle = rnd.nextRange(-Math.PI, Math.PI);
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed - rnd.nextRange(20, 60);
        particle.rotation = rnd.nextRange(-Math.PI, Math.PI);
        particle.spin = rnd.nextRange(-4, 4);
        particle.startScale = rnd.nextRange(0.28, 0.6);
        particle.endScale = 0.06;
        particle.startAlpha = 1;
        particle.endAlpha = 0;
        particle.tint = rnd.choose([0xffd86b, 0xffe59a, 0xffc84b]);
        particle.sprite.alpha = particle.startAlpha;
        particle.sprite.scale.set(particle.startScale);
        particle.sprite.rotation = particle.rotation;
        particle.sprite.tint = particle.tint;
    }

    public init() {
        this.game.systems.get(TrackSystem).renderer.addChild(this._container);

        const particleTexture = Texture.from('particle.png');

        for(let i = 0; i < this._poolSize; i++) {
            const record = createParticleRecord(new Sprite(particleTexture));
            resetParticle(record);
            this._particles.push(record);
            this._container.addChild(record.sprite);
        }
    }

    public update(alpha: number) {
        for (const particle of this._particles) {
            if (!particle.active) continue;

            const sprite = particle.sprite;

            sprite.x = particle.prevX + (particle.x - particle.prevX) * alpha;
            sprite.y = particle.prevY + (particle.y - particle.prevY) * alpha;

            const t = particle.maxLife > 0 ? 1 - particle.life / particle.maxLife : 1;

            const scale =
                particle.startScale + (particle.endScale - particle.startScale) * t;
            const particleAlpha =
                particle.startAlpha + (particle.endAlpha - particle.startAlpha) * t;

            sprite.scale.set(scale);
            sprite.alpha = particleAlpha;
            sprite.rotation = particle.rotation;
            sprite.tint = particle.tint;
        }
    }

    public fixedUpdate(fixedDelta: number) {
        for(const particle of this._particles) {
            if(!particle.active) continue;

            particle.prevX = particle.x;
            particle.prevY = particle.y;

            particle.x += particle.vx * fixedDelta;
            particle.y += particle.vy * fixedDelta;

            particle.vy += this._gravity * fixedDelta;

            particle.vx *= this._drag;
            particle.vy *= this._drag;

            particle.rotation += particle.spin * fixedDelta;

            particle.life -= fixedDelta;

            if(particle.life <= 0) {
                resetParticle(particle);
            }
        }
    }

    public end() {
        this.reset();
    }

    public reset() {
        for(const particle of this._particles) {
            resetParticle(particle);
        }
    }

    public rebase(offsetX: number, offsetY: number) {
        for (const particle of this._particles) {
            if (!particle.active) continue;
            particle.prevX -= offsetX;
            particle.prevY -= offsetY;
            particle.x -= offsetX;
            particle.y -= offsetY;
        }
    }

    public spawnBallExplosion(
        x: number,
        y: number,
        baseVX: number,
        baseVY: number,
        side: number,
        screenX: number,
    ) {
        const particleCount = 56;
        const rnd = this.game.rng;
        const centerDir = screenX < this.game.gameContainer.width * 0.5 ? 1 : -1;
        const centerBias = centerDir * 320;
        const sideBias = side * 70;
        const tintChoices = [0xd9ffe8, 0xb8ffcf, 0x8cffb0, 0x5ef28d, 0x3ce676, 0x24cf5f];

        for(let i = 0; i < particleCount; i++) {
            const particle = this._getFreeParticle();
            if(!particle) break;

            const isCoreBurst = i < 16;

            particle.active = true;
            particle.sprite.visible = true;
            particle.x = x;
            particle.y = y;
            particle.prevX = x;
            particle.prevY = y;
            particle.maxLife = isCoreBurst ? rnd.nextRange(1.1, 1.9) : rnd.nextRange(1.0, 1.7);
            particle.life = particle.maxLife;
            particle.vx = baseVX * 0.15 + centerBias + sideBias + rnd.nextRange(-320, 320);
            particle.vy = baseVY * 0.12 + rnd.nextRange(-320, 220);
            particle.rotation = rnd.nextRange(-Math.PI, Math.PI);
            particle.spin = rnd.nextRange(-18, 18);
            particle.startScale = isCoreBurst ? rnd.nextRange(1.8, 3.8) : rnd.nextRange(1.2, 2.6);
            particle.endScale = rnd.nextRange(0.18, 0.45);
            particle.startAlpha = rnd.nextRange(0.9, 1);
            particle.endAlpha = 0;
            particle.tint = isCoreBurst ? rnd.choose([0xd9ffe8, 0xb8ffcf, 0x8cffb0]) : rnd.choose(tintChoices);
        }
    }

    public spawnBallLanding(
        x: number,
        y: number,
        nx: number,
        ny: number,
        side: number,
        impact: number,
    ) {
        const intensity = Math.min(1, impact / 700);
        const particleCount = 14 + Math.round(intensity * 14);
        const rnd = this.game.rng;
        const tangentX = ny;
        const tangentY = -nx;
        const outwardX = nx * side;
        const outwardY = ny * side;
        const contactX = x + outwardX * 6;
        const contactY = y + outwardY * 6;
        const tintChoices = [0xf2ffe8, 0xd9ffe8, 0xb8ffcf, 0x8cffb0];

        for (let i = 0; i < particleCount; i++) {
            const particle = this._getFreeParticle();
            if (!particle) break;

            const tangentDrift = rnd.nextRange(-150, 150);
            const outwardBurst = rnd.nextRange(70, 210) * (0.8 + intensity * 0.9);
            const lift = rnd.nextRange(20, 120) * (0.55 + intensity);

            particle.active = true;
            particle.sprite.visible = true;
            particle.x = contactX + tangentX * rnd.nextRange(-8, 8);
            particle.y = contactY + tangentY * rnd.nextRange(-6, 6);
            particle.prevX = particle.x;
            particle.prevY = particle.y;
            particle.maxLife = rnd.nextRange(0.3, 0.54);
            particle.life = particle.maxLife;
            particle.vx = tangentX * tangentDrift + outwardX * outwardBurst;
            particle.vy = tangentY * tangentDrift + outwardY * outwardBurst - lift;
            particle.rotation = rnd.nextRange(-Math.PI, Math.PI);
            particle.spin = rnd.nextRange(-10, 10);
            particle.startScale = rnd.nextRange(0.55, 1.15) * (1 + intensity * 0.8);
            particle.endScale = rnd.nextRange(0.08, 0.22);
            particle.startAlpha = rnd.nextRange(0.8, 1);
            particle.endAlpha = 0;
            particle.tint = rnd.choose(tintChoices);
            particle.sprite.alpha = particle.startAlpha;
            particle.sprite.scale.set(particle.startScale);
            particle.sprite.rotation = particle.rotation;
            particle.sprite.tint = particle.tint;
        }
    }
}
