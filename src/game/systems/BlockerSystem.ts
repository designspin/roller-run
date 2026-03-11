import { HazardSystem, type HazardConfig } from "./HazardSystem";

export class BlockerSystem extends HazardSystem {
    public static SYSTEM_ID = 'blocker';

    protected readonly _config: HazardConfig = {
        spawnLead: 5.0,
        speed: 0.5,
        hitPadding: 30,
        minTotalProgress: 50,
        poolSize: 3,
        trailPoolSize: 60,
        initialSpawnTimer: 3.0,
        spawnTimerRange: [6.0, 3.0],
        spawnTimerDecay: 200,
        glowTint: 0x00aaff,
        glowScale: 8,
        glowAlpha: 0.3,
        coreTint: 0x88eeff,
        coreScale: 3,
        pulseSpeed: 10,
        pulseAmplitude: 0.1,
        pulseSizeScale: 4,
        trailGravity: 280,
        trailSpreadXY: [8, 8],
        trailVxRange: [-40, 40],
        trailVyRange: [40, 120],
        trailLifeRange: [0.18, 0.32],
        trailTints: [0x00ddff, 0x0088ff],
        positionOnTrack: (pos) => ({
            x: pos.x,
            y: pos.y,
        }),
        pickSide: () => 0,
    };
}
