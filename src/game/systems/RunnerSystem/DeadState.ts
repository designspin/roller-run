import type { RunnerSystem } from ".";
import type { SystemState } from "@/game/SystemRunner";
import { designConfig } from "@/game/designConfig";

export class DeadState implements SystemState<RunnerSystem> {
    public update(ctx: RunnerSystem, _interpolated: number) {
        if (!ctx.ball.isFalling || ctx.ball.hasExploded) {
            return;
        }

        const margin = ctx.ball.radius;
        const screenX = ctx.renderer.x + ctx.ball.x;
        const screenY = ctx.renderer.y + ctx.ball.y;

        const isOffscreen = screenX < -margin
            || screenX > designConfig.content.width + margin
            || screenY < -margin
            || screenY > designConfig.content.height + margin;

        if (!isOffscreen) {
            return;
        }

        const clampedScreenX = Math.max(16, Math.min(designConfig.content.width - 16, screenX));
        const clampedScreenY = Math.max(16, Math.min(designConfig.content.height - 16, screenY));
        const spawnX = clampedScreenX - ctx.renderer.x;
        const spawnY = clampedScreenY - ctx.renderer.y;

        ctx.particleSystem.spawnBallExplosion(
            spawnX,
            spawnY,
            ctx.ball.fallVelocityX,
            ctx.ball.fallVelocityY,
            ctx.ball.side,
            clampedScreenX,
        );
        ctx.ball.explode();
    }

    public fixedUpdate(ctx: RunnerSystem, fixedDelta: number) {
        ctx.driftCenter(fixedDelta);

        if (!ctx.ball.hasExploded) {
            ctx.ball.updatePhysics(fixedDelta, ctx.halfWidth);
        }
    }

    public doAction(ctx: RunnerSystem) {
        ctx.clearQueuedInput();
    }
}