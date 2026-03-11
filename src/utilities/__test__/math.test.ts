import { describe, it, expect } from "vitest";
import { catmullRom, catmullRomTangent } from "../math";

describe("catmullRom", () => {
    it("Returns p1 when t is 0", () => {
        expect(catmullRom(0, 5, 10, 15, 0)).toBe(5);
    });

    it("Returns p2 when t is 1", () => {
        expect(catmullRom(0, 5, 10, 15, 1)).toBe(10);
    });

    it('Returns midpoint-ish value when t is 0.5', () => {
        const result = catmullRom(0, 0, 10, 10, 0.5);
        expect(result).toBeCloseTo(5,1);
    });
});

describe('catmullRomTangent', () => {
    it('returns consistent tangent for linear points', () => {
        const t0 = catmullRomTangent(0, 5, 10, 15, 0);
        const t1 = catmullRomTangent(0, 5, 10, 15, 0.5);
        const t2 = catmullRomTangent(0, 5, 10, 15, 1);
        expect(t0).toBeCloseTo(t1, 5);
        expect(t1).toBeCloseTo(t2, 5);
    });

    it('tangent is positive when p2 > p1', () => {
        expect(catmullRomTangent(0, 0, 10, 10, 0.5)).toBeGreaterThan(0);
    });

    it('tangent is negative when p2 < p1', () => {
        expect(catmullRomTangent(10, 10, 0, 0, 0.5)).toBeLessThan(0);
    });

    it('tangent at t=0 equals 0.5 * (p2 - p0)', () => {
        const p0 = 2, p1 = 5, p2 = 11, p3 = 15;
        const result = catmullRomTangent(p0, p1, p2, p3, 0);
        expect(result).toBeCloseTo(0.5 * (p2 - p0));
    });

    it('tangent at t=1 equals 0.5 * (p3 - p1)', () => {
        const p0 = 2, p1 = 5, p2 = 11, p3 = 15;
        const result = catmullRomTangent(p0, p1, p2, p3, 1);
        expect(result).toBeCloseTo(0.5 * (p3 - p1));
    });
});