import { Container, Mesh, MeshGeometry, Shader, GlProgram } from "pixi.js";
import { TrackGenerator } from "./TrackGenerator";
import { catmullRom, catmullRomTangent } from "@/utilities/math";
import vertSrc from "@/shaders/trackwall.vert?raw";
import fragSrc from "@/shaders/trackwall.frag?raw";

export class TrackRenderer extends Container {
    private static readonly SAMPLES_PER_SEGMENT = 12;

    private _track: TrackGenerator;
    private _halfWidth: number;
    private _thickness: number;
    private _leftMesh: Mesh<MeshGeometry, Shader>;
    private _rightMesh: Mesh<MeshGeometry, Shader>;
    private _leftGeometry: MeshGeometry;
    private _rightGeometry: MeshGeometry;
    private _distanceOffset = 0;
    private _distances = new Float32Array(0);

    private static _createShader(r: number, g: number, b: number, frequency: number): Shader {
        const glProgram = new GlProgram({ vertex: vertSrc, fragment: fragSrc });

        return new Shader({
            glProgram,
            resources: {
                uniforms: {
                    uWallColor: { value: new Float32Array([r, g, b, 1.0]), type: 'vec4<f32>' },
                    uFrequency: { value: frequency, type: 'f32' },
                },
            },
        });
    }

    constructor(track: TrackGenerator, halfWidth: number = 200, thickness: number = 20) {
        super();

        this._track = track;
        this._halfWidth = halfWidth;
        this._thickness = thickness;

        this._leftGeometry = new MeshGeometry({
            positions: new Float32Array(0),
            uvs: new Float32Array(0),
            indices: new Uint32Array(0),
        });

        this._rightGeometry = new MeshGeometry({
            positions: new Float32Array(0),
            uvs: new Float32Array(0),
            indices: new Uint32Array(0),
        });

        this._leftMesh = new Mesh({
            geometry: this._leftGeometry,
            shader: TrackRenderer._createShader(0.6, 0.75, 0.65, 0.5),
        });

        this._rightMesh = new Mesh({
            geometry: this._rightGeometry,
            shader: TrackRenderer._createShader(0.6, 0.75, 0.65, 0.5),
        });

        this.addChild(this._leftMesh, this._rightMesh);
    }

    get halfWidth() {
        return this._halfWidth;
    }

    public rebuild(maxSegments: number = Number.POSITIVE_INFINITY) {
        const points = this._track.points;
        const segmentCount = Math.min(points.length - 1, maxSegments);

        if (segmentCount <= 0) {
            this._leftGeometry.positions = new Float32Array(0);
            this._leftGeometry.uvs = new Float32Array(0);
            this._leftGeometry.indices = new Uint32Array(0);
            this._rightGeometry.positions = new Float32Array(0);
            this._rightGeometry.uvs = new Float32Array(0);
            this._rightGeometry.indices = new Uint32Array(0);
            this._distances = new Float32Array(0);
            return;
        }

        const steps = TrackRenderer.SAMPLES_PER_SEGMENT;
        const sampleCount = segmentCount * steps + 1;
        const distances = new Float32Array(sampleCount);
        const leftPositions = new Float32Array(sampleCount * 4);
        const rightPositions = new Float32Array(sampleCount * 4);
        const leftUVs = new Float32Array(sampleCount * 4);
        const rightUVs = new Float32Array(sampleCount * 4);
        let accDist = this._distanceOffset;
        let prevCx = 0, prevCy = 0;
        let sampleIndex = 0;
    
        for (let i = 0; i < segmentCount; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            for (let s = 0; s <= steps; s++) {
                if (i > 0 && s === 0) continue;

                const t = s / steps;

                const cx = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
                const cy = catmullRom(p0.y, p1.y, p2.y, p3.y, t);

                if (i > 0 || s > 0) {
                    const dx = cx - prevCx;
                    const dy = cy - prevCy;
                    accDist += Math.sqrt(dx * dx + dy * dy);
                }
                prevCx = cx;
                prevCy = cy;
                distances[sampleIndex] = accDist;

                const tx = catmullRomTangent(p0.x, p1.x, p2.x, p3.x, t);
                const ty = catmullRomTangent(p0.y, p1.y, p2.y, p3.y, t);
                const len = Math.sqrt(tx * tx + ty * ty);
                const nx = -ty / len;
                const ny = tx / len;

                const hw = this._halfWidth;
                const outer = this._halfWidth + this._thickness;

                const loX = cx + nx * outer;
                const loY = cy + ny * outer;
                const liX = cx + nx * hw;
                const liY = cy + ny * hw;
                const roX = cx - nx * outer;
                const roY = cy - ny * outer;
                const riX = cx - nx * hw;
                const riY = cy - ny * hw;

                const posIndex = sampleIndex * 4;
                leftPositions[posIndex] = loX;
                leftPositions[posIndex + 1] = loY;
                leftPositions[posIndex + 2] = liX;
                leftPositions[posIndex + 3] = liY;

                rightPositions[posIndex] = roX;
                rightPositions[posIndex + 1] = roY;
                rightPositions[posIndex + 2] = riX;
                rightPositions[posIndex + 3] = riY;

                const v = accDist / 100;
                leftUVs[posIndex] = 0;
                leftUVs[posIndex + 1] = v;
                leftUVs[posIndex + 2] = 1;
                leftUVs[posIndex + 3] = v;

                rightUVs[posIndex] = 0;
                rightUVs[posIndex + 1] = v;
                rightUVs[posIndex + 2] = 1;
                rightUVs[posIndex + 3] = v;

                sampleIndex++;
            }
        }

        const segments = this._track.segments;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let i = 0; i < sampleCount - 1; i++) {
            const seg = Math.floor(i / TrackRenderer.SAMPLES_PER_SEGMENT);
            const segment = segments[seg];
            const vi = i * 2;

            if (!segment?.gapLeft) {
                leftIdx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
            }
            if (!segment?.gapRight) {
                rightIdx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
            }
        }

        this._leftGeometry.positions = leftPositions;
        this._leftGeometry.uvs = leftUVs;
        this._leftGeometry.indices = new Uint32Array(leftIdx);

        this._rightGeometry.positions = rightPositions;
        this._rightGeometry.uvs = rightUVs;
        this._rightGeometry.indices = new Uint32Array(rightIdx);

        this._distances = distances;
    }

    public reset() {
        this._distanceOffset = 0;
        this._distances = new Float32Array(0);
    }

    public notifyCull(pointCount: number) {
        const sampleIndex = TrackRenderer.SAMPLES_PER_SEGMENT * pointCount;

        if (sampleIndex < this._distances.length) {
            this._distanceOffset = this._distances[sampleIndex];
        }
    }
}