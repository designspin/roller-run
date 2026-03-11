import type { Sprite } from "pixi.js";

export type ParticleRecord = {
    active: boolean;
    sprite: Sprite;
    tint: number;

    x: number;
    y: number;
    prevX: number;
    prevY: number;

    vx: number;
    vy: number;

    life: number;
    maxLife: number;

    rotation: number;
    spin: number;

    startScale: number;
    endScale: number;

    startAlpha: number;
    endAlpha: number;
}

export function createParticleRecord(sprite: Sprite): ParticleRecord {
    return {
        active: false,
        sprite,
        tint: 0xffffff,
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        rotation: 0,
        spin: 0,
        startScale: 1,
        endScale: 0,
        startAlpha: 1,
        endAlpha: 0,
    };
}

export function resetParticle(record: ParticleRecord): ParticleRecord {
    record.active = false;
    record.sprite.anchor.set(0.5);
    record.sprite.visible = false;
    record.sprite.alpha = 0;
    record.sprite.scale.set(1);
    record.sprite.rotation = 0;
    record.sprite.tint = 0xffffff;
    record.tint = 0xffffff;
    record.x = 0;
    record.y = 0;
    record.prevX = 0;
    record.prevY = 0;
    record.vx = 0;
    record.vy = 0;
    record.life = 0;
    record.maxLife = 0;
    record.rotation = 0;
    record.spin = 0;
    record.startScale = 1;
    record.endScale = 0;
    record.startAlpha = 1;
    record.endAlpha = 0;
    return record;
}