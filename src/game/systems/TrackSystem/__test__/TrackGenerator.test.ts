import { describe, it, expect } from "vitest";
import { TrackGenerator } from "../TrackGenerator";

describe("TrackGenerator", () => {
    const config = {
        ySpacingMin: 50,
        ySpacingMax: 100,
        xWanderMax: 20,
        xMin: 100,
        xMax: 300,
    };

    it("generates points with correct spacing and wandering", () => {
        const generator = new TrackGenerator(12345, config);
        const points = generator.points;

        for(let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];

            const ySpacing = curr.y - prev.y;
            expect(ySpacing).toBeGreaterThanOrEqual(config.ySpacingMin);
            expect(ySpacing).toBeLessThanOrEqual(config.ySpacingMax);

            const xWander = Math.abs(curr.x - prev.x);
            expect(xWander).toBeLessThanOrEqual(config.xWanderMax);
            expect(curr.x).toBeGreaterThanOrEqual(config.xMin);
            expect(curr.x).toBeLessThanOrEqual(config.xMax);
        }
    });

    it("generates consistent points for the same seed", () => {
        const generator1 = new TrackGenerator(12345, config);
        const generator2 = new TrackGenerator(12345, config);

        expect(generator1.points).toEqual(generator2.points);
    });
});