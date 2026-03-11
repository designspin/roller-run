export interface DifficultyParams {
    speed: number;
    gapProbability: number;
    gapMinCooldown: number;
}

/**
 * Returns difficulty parameters as a function of total distance traveled.
 * Uses an exponential ramp so difficulty rises quickly early and tapers off.
 *   speed:           400 → 700  (tau ≈ 120 units)
 *   gapProbability:  0.15 → 0.50 (tau ≈ 120 units)
 *   gapMinCooldown:  3 → 0       (tau ≈ 120 units)
 */
export function getDifficultyParams(totalProgress: number): DifficultyParams {
    const t = 1 - Math.exp(-totalProgress / 120);
    return {
        speed: 400 + 300 * t,
        gapProbability: 0.15 + 0.35 * t,
        gapMinCooldown: Math.round(3 * (1 - t)),
    };
}
