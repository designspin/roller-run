import type { System, SystemState, SystemStateMachine } from "@/game/SystemRunner";
import { Game } from "@/game";
import { TrackSystem } from "../TrackSystem";
import { InputSystem } from "../InputSystem/input";
import { InputAction } from "../InputSystem/InputAction";
import { Ball } from "@/game/entities/Ball";
import { BallEffects } from "@/game/entities/BallEffects";
import { designConfig } from "@/game/designConfig";
import { ParticleSystem } from "../ParticleSystem";
import { DeadState } from "./DeadState";
import { ReadyState } from "./ReadyState";
import { getDifficultyParams } from "@/game/difficulty";
import { sound } from "@pixi/sound";

export class RunnerSystem implements System, SystemStateMachine<RunnerSystem> {
    public static SYSTEM_ID = 'runner';
    private static readonly START_PROGRESS = 1;
    private static readonly LANDING_SHAKE_DURATION = 0.38;
    public game!: Game;
    
    private _progress: number = RunnerSystem.START_PROGRESS;
    private _totalProgress: number = 0;
    private _speed: number = 400;
    
    private _trackSystem!: TrackSystem;
    private _inputSystem!: InputSystem;
    private _particleSystem!: ParticleSystem;
    private _ball!: Ball;

    private _prevCenterX = 0;
    private _prevCenterY = 0;
    private _centerX = 0;
    private _centerY = 0;
    private _interpCenterX = 0;
    private _interpCenterY = 0;
    private _centerVelocityX = 0;
    private _centerVelocityY = 0;
    private _prevShakeX = 0;
    private _prevShakeY = 0;
    private _shakeX = 0;
    private _shakeY = 0;
    private _shakeTime = 0;
    private _shakeStrength = 0;
    private _shakePhase = 0;
    private _state!: SystemState<RunnerSystem>;

    constructor() {
        this._state = new ReadyState();
    }

    get centerX() { return this._interpCenterX; }
    get centerY() { return this._interpCenterY; }
    get worldCenterY() { return this._centerY; }
    get isDead() { return this._state instanceof DeadState; }
    get countdownLabel() {
        return this._state instanceof ReadyState ? this._state.label : null;
    }

    get progress() {
        return this._progress;
    }

    get totalProgress() {
        return this._totalProgress;
    }

    get ball() {
        return this._ball;
    }

    get speed() {
        return this._speed;
    }

    get halfWidth() {
        return this._trackSystem.halfWidth;
    }

    get renderer() {
        return this._trackSystem.renderer;
    }

    get particleSystem() {
        return this._particleSystem;
    }

    setState(state: SystemState<RunnerSystem>) {
        this._state = state;
    }

    getState() {
        return this._state;
    }

    switchState(state: SystemState<RunnerSystem>) {
        this._state = state;
        this._state.doAction(this);
    }

    public async init() {
        this._trackSystem = this.game.systems.get(TrackSystem);
        this._inputSystem = this.game.systems.get(InputSystem);
        this._particleSystem = this.game.systems.get(ParticleSystem);

        this._ball = new Ball();
        const effects = new BallEffects(this._ball);
        this._ball.addChild(effects);
        this._trackSystem.renderer.addChild(this._ball);

    }

    public async awake() {

    }

    public start() {
        this.switchState(new ReadyState());
    }

    public update(alpha: number) {
        this._ball.interpolate(alpha);
        this._ball.updateRotation();
        this._interpCenterX = this._prevCenterX + (this._centerX - this._prevCenterX) * alpha;
        this._interpCenterY = this._prevCenterY + (this._centerY - this._prevCenterY) * alpha;
        const shakeX = this._prevShakeX + (this._shakeX - this._prevShakeX) * alpha;
        const shakeY = this._prevShakeY + (this._shakeY - this._prevShakeY) * alpha;

        const renderer = this._trackSystem.renderer;
        renderer.x = designConfig.content.width / 2 - this._interpCenterX + shakeX;
        renderer.y = designConfig.content.height * 0.75 - this._interpCenterY + shakeY;

        this._state.update?.(this, alpha);
    }

    public fixedUpdate(fixedDelta: number) {
        this._state.fixedUpdate?.(this, fixedDelta);
        this._updateLandingShake(fixedDelta);
    }

    public end() {
        if (this._state instanceof ReadyState) {
            this._state.cleanup();
        }
    }

    public reset() {
        if (this._state instanceof ReadyState) {
            this._state.cleanup();
        }

        this._progress = RunnerSystem.START_PROGRESS;
        this._totalProgress = 0;
        this._prevCenterX = 0;
        this._prevCenterY = 0;
        this._centerX = 0;
        this._centerY = 0;
        this._interpCenterX = 0;
        this._interpCenterY = 0;
        this._centerVelocityX = 0;
        this._centerVelocityY = 0;
        this._prevShakeX = 0;
        this._prevShakeY = 0;
        this._shakeX = 0;
        this._shakeY = 0;
        this._shakeTime = 0;
        this._shakeStrength = 0;
        this._shakePhase = 0;
        this._state = new ReadyState();
        this._ball.reset();
    }

    public adjustProgress(amount: number) {
        this._progress += amount;
    }

    public clearQueuedInput() {
        this._inputSystem.consume();
    }

    public snapToTrack() {
        const pos = this._trackSystem.generator.getPositionAtProgress(this._progress);

        this._prevCenterX = pos.x;
        this._prevCenterY = pos.y;
        this._centerX = pos.x;
        this._centerY = pos.y;
        this._interpCenterX = pos.x;
        this._interpCenterY = pos.y;
        this._centerVelocityX = 0;
        this._centerVelocityY = 0;
        this._prevShakeX = 0;
        this._prevShakeY = 0;
        this._shakeX = 0;
        this._shakeY = 0;

        this._ball.snapToTrack(pos, this._trackSystem.halfWidth);
    }

    public runStep(fixedDelta: number) {
        const actions = this._inputSystem.consume();

        for (const action of actions) {
            if (action === InputAction.Jump) this._ball.startJump();
            if (action === InputAction.Flip) this._ball.convertToFlip();
        }

        const hw = this._trackSystem.halfWidth;

        const ballStep = this._ball.updatePhysics(fixedDelta, hw);

        const prePos = this._trackSystem.generator.getPositionAtProgress(this._progress);
        const { speed } = getDifficultyParams(this._totalProgress);
        const progressDelta = (speed * fixedDelta) / prePos.tangentLength;
        this._progress += progressDelta;
        this._totalProgress += progressDelta;

        const pos = this._trackSystem.generator.getPositionAtProgress(this._progress);
        this._ball.positionOnTrack(pos, hw);

        if (ballStep.landed) {
            this._particleSystem.spawnBallLanding(
                this._ball.fixedX,
                this._ball.fixedY,
                pos.nx,
                pos.ny,
                this._ball.side,
                ballStep.landingImpact,
            );
            this.triggerLandingShake(ballStep.landingImpact);
        }

        this._centerVelocityX = (pos.x - this._centerX) / fixedDelta;
        this._centerVelocityY = (pos.y - this._centerY) / fixedDelta;

        this._prevCenterX = this._centerX;
        this._prevCenterY = this._centerY;
        this._centerX = pos.x;
        this._centerY = pos.y;

        return pos;
    }

    public driftCenter(fixedDelta: number) {
        this._prevCenterX = this._centerX;
        this._prevCenterY = this._centerY;

        this._centerX += this._centerVelocityX * fixedDelta;
        this._centerY += this._centerVelocityY * fixedDelta;

        const damping = Math.exp(-3 * fixedDelta);
        this._centerVelocityX *= damping;
        this._centerVelocityY *= damping;
    }

    public isGapAtCurrentProgress() {
        const segment = this._trackSystem.generator.getSegmentAt(this._progress);
        return this._ball.side === 1 ? segment.gapLeft : segment.gapRight;
    }

    public beginDeath(pos: { x: number; y: number; nx: number; ny: number }) {
        this._ball.startFall(pos, this._trackSystem.halfWidth);
        this.switchState(new DeadState());
    }

    public beginImpactDeath(_pos: { x: number; y: number; nx: number; ny: number }) {
        const ballX = this._ball.fixedX;
        const ballY = this._ball.fixedY;
        const screenX = this._trackSystem.renderer.x + ballX;
        const screenY = this._trackSystem.renderer.y + ballY;
        const clampedScreenX = Math.max(16, Math.min(designConfig.content.width - 16, screenX));
        const clampedScreenY = Math.max(16, Math.min(designConfig.content.height - 16, screenY));
        const spawnX = clampedScreenX - this._trackSystem.renderer.x;
        const spawnY = clampedScreenY - this._trackSystem.renderer.y;

        this._particleSystem.spawnBallExplosion(spawnX, spawnY, 0, 0, this._ball.side, clampedScreenX);
        this._ball.explode();
        this.switchState(new DeadState());
    }

    public rebaseWorld(offsetX: number, offsetY: number) {
        this._prevCenterX -= offsetX;
        this._prevCenterY -= offsetY;
        this._centerX -= offsetX;
        this._centerY -= offsetY;
        this._interpCenterX -= offsetX;
        this._interpCenterY -= offsetY;
        this._ball.rebase(offsetX, offsetY);
    }

    public triggerLandingShake(impact: number) {
        const intensity = Math.min(1, impact / 700);

        if (intensity <= 0) {
            return;
        }

        sound.play('audio/contact-ground.wav');
        this._shakeTime = RunnerSystem.LANDING_SHAKE_DURATION;
        this._shakeStrength = 7 + intensity * 11;
        this._shakePhase = 0;
    }

    private _updateLandingShake(fixedDelta: number) {
        this._prevShakeX = this._shakeX;
        this._prevShakeY = this._shakeY;

        if (this._shakeTime <= 0) {
            this._shakeX = 0;
            this._shakeY = 0;
            return;
        }

        this._shakeTime = Math.max(0, this._shakeTime - fixedDelta);
        this._shakePhase += fixedDelta;

        const elapsed = RunnerSystem.LANDING_SHAKE_DURATION - this._shakeTime;
        const damping = Math.exp(-7.5 * elapsed);
        const spring = Math.cos(28 * elapsed);
        const rebound = Math.sin(18 * elapsed);
        const amplitude = this._shakeStrength * damping;

        this._shakeX = -spring * amplitude;
        this._shakeY = rebound * amplitude * 0.25;
    }

}