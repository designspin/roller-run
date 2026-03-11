import type { RunnerSystem } from ".";
import type { SystemState } from "@/game/SystemRunner";

export class RunningState implements SystemState<RunnerSystem> {
    public update(_ctx: RunnerSystem, _interpolated: number) {}

    public fixedUpdate(ctx: RunnerSystem, fixedDelta: number) {
        const pos = ctx.runStep(fixedDelta);

        if (!ctx.ball.isJumping && ctx.isGapAtCurrentProgress()) {
            ctx.beginDeath(pos);
        }
    }

    public doAction(ctx: RunnerSystem) {
        ctx.clearQueuedInput();
    }
}