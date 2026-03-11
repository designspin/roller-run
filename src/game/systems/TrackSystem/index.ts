import type { System } from "@/game/SystemRunner";
import { Game } from "@/game";
import { TrackGenerator } from "./TrackGenerator";
import { TrackRenderer } from "./TrackRenderer";
import { RunnerSystem } from "../RunnerSystem";
import { getDifficultyParams } from "@/game/difficulty";

const REBASEABLE_SYSTEMS = ['collectible', 'spark', 'blocker', 'particle'] as const;
const PROGRESS_SYSTEMS = ['collectible', 'spark', 'blocker'] as const;

export class TrackSystem implements System {
    public static SYSTEM_ID = 'track';
    private static readonly RENDER_SEGMENT_COUNT = 8;
    private static readonly REBASE_Y_THRESHOLD = -10000;
    public game!: Game;

    public generator!: TrackGenerator;
    private _trackRenderer!: TrackRenderer;
    private _isDirty = true;
    private _pendingRebase: number | null = null;

    get halfWidth() {
        return this._trackRenderer.halfWidth;
    }

    get renderer() {
        return this._trackRenderer;
    }

    public init() {
        this.generator = new TrackGenerator(this.game.rng);
        this._trackRenderer = new TrackRenderer(this.generator);
        this.game.addToGame(this._trackRenderer);
    }

    public start() {
        this._trackRenderer.rebuild(TrackSystem.RENDER_SEGMENT_COUNT);
        this._isDirty = false;
    }

    public fixedUpdate(_fixedDelta: number) {
        const runner = this.game.systems.get(RunnerSystem);
        let changed = false;

        while(runner.progress > this.generator.points.length - 5) {
            const { gapProbability, gapMinCooldown } = getDifficultyParams(runner.totalProgress);
            this.generator.setGapConfig(gapProbability, gapMinCooldown);
            this.generator.generateNext();
            changed = true;
        }

        const cullBehind = Math.floor(runner.progress) - 3;

        if(cullBehind > 0) {
            this._trackRenderer.notifyCull(cullBehind);
            this.generator.points.splice(0, cullBehind);
            this.generator.segments.splice(0, cullBehind);
            runner.adjustProgress(-cullBehind);

            for (const id of PROGRESS_SYSTEMS) {
                this.game.systems.allSystems.get(id)?.adjustProgress?.(-cullBehind);
            }
            changed = true;
        }

        if (runner.worldCenterY < TrackSystem.REBASE_Y_THRESHOLD) {
            if (this._pendingRebase === null) {
                this._pendingRebase = runner.worldCenterY;
                this.game.systems.onAfterFixedUpdate((_) => {
                    const offsetY = this._pendingRebase as number;
                    this.generator.rebase(0, offsetY);
                    runner.rebaseWorld(0, offsetY);

                    for (const id of REBASEABLE_SYSTEMS) {
                        this.game.systems.allSystems.get(id)?.rebase?.(0, offsetY);
                    }
                     this._trackRenderer.rebuild(TrackSystem.RENDER_SEGMENT_COUNT);
                    this._isDirty = false;
                    this._pendingRebase = null;
                }, { once: true });
            }
            changed = true;
        }

        if (changed || this._isDirty) {
            this._trackRenderer.rebuild(TrackSystem.RENDER_SEGMENT_COUNT);
            this._isDirty = false;
        }
    }

    public reset() {
        this._isDirty = true;
    }
}
