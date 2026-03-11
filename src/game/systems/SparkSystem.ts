import { HazardSystem, type HazardConfig } from "./HazardSystem";

export class SparkSystem extends HazardSystem {
    public static SYSTEM_ID = 'spark';

    protected readonly _config: HazardConfig = {
        spawnLead: 4.5,
        speed: 0.4,
        hitPadding: 20,
        minTotalProgress: 20,
        poolSize: 4,
        trailPoolSize: 96,
        initialSpawnTimer: 2.0,
        spawnTimerRange: [4.5, 2.0],
        spawnTimerDecay: 150,
        glowTint: 0xff6600,
        glowScale: 6,
        glowAlpha: 0.4,
        coreTint: 0xffff88,
        coreScale: 2.5,
        pulseSpeed: 12,
        pulseAmplitude: 0.12,
        pulseSizeScale: 3,
        trailGravity: 320,
        trailSpreadXY: [5, 5],
        trailVxRange: [-60, 60],
        trailVyRange: [60, 160],
        trailLifeRange: [0.14, 0.26],
        trailTints: [0xffdd00, 0xff8800],
        positionOnTrack: (pos, hw, side) => ({
            x: pos.x + pos.nx * hw * side,
            y: pos.y + pos.ny * hw * side,
        }),
        pickSide: (rng) => rng.next() < 0.5 ? 1 : -1,
    };
}
