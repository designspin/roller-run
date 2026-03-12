import { Container, EventEmitter } from "pixi.js";
import { sound } from "@pixi/sound";
import { designConfig } from "@/game/designConfig";

export type BallPhysicsResult = {
    landed: boolean;
    landingImpact: number;
};

export type BallEvents = {
    jump: [];
    doubleJump: [];
    land: [impactSpeed: number];
    fallStart: [];
    explode: [];
    reset: [];
    frameUpdate: [dx: number, dy: number, rotationDelta: number, isFlipping: boolean];
};

export class Ball extends Container {
    readonly events = new EventEmitter<BallEvents>();
    private _jumpOffset = 0;
    private _jumpVelocity = 0;
    private _isJumping = false;
    private _isFlipping = false;
    private readonly _gravity = 800;
    private readonly _jumpStrength = 500;
    private _side = 1;
    private _prevX = 0;
    private _prevY = 0;

    private _fixedX = 0;
    private _fixedY = 0;
    private _prevFixedX = 0;
    private _prevFixedY = 0;
    private _isFalling = false;
    private _hasExploded = false;
    private _fallVelocityX = 0;
    private _fallVelocityY = 0;
    private _fallGravityX = 0;
    private _fallGravityY = 0;

    get side() { return this._side; }
    get isJumping() { return this._isJumping; }
    get isFalling() { return this._isFalling; }
    get hasExploded() { return this._hasExploded; }
    get fallVelocityX() { return this._fallVelocityX; }
    get fallVelocityY() { return this._fallVelocityY; }
    get jumpOffset() { return this._jumpOffset; }
    get radius() { return designConfig.ball.radius; }
    get fixedX() { return this._fixedX; }
    get fixedY() { return this._fixedY; }

    public startJump() {
        if (this._isJumping) return;
        if (sound.exists('audio/jump.wav')) sound.play('audio/jump.wav');
        this._isJumping = true;
        this._isFlipping = false;
        this._jumpVelocity = this._jumpStrength;
        this.events.emit('jump');
    }

    public updatePhysics(fixedDelta: number, hw: number): BallPhysicsResult {
        let landed = false;
        let landingImpact = 0;

        if (this._isFalling) {
            this._prevFixedX = this._fixedX;
            this._prevFixedY = this._fixedY;
            this._fallVelocityX += this._fallGravityX * fixedDelta;
            this._fallVelocityY += this._fallGravityY * fixedDelta;
            this._fixedX += this._fallVelocityX * fixedDelta;
            this._fixedY += this._fallVelocityY * fixedDelta;
            return { landed, landingImpact };
        }

        if (!this._isJumping) return { landed, landingImpact };

        if (!this._isFlipping) {
            this._jumpVelocity -= this._gravity * fixedDelta;
        }
        this._jumpOffset += this._jumpVelocity * fixedDelta;

        if (this._isFlipping) {
            const flipDistance = 2 * (hw - this.radius);
            if (this._jumpOffset >= flipDistance) {
                landingImpact = Math.abs(this._jumpVelocity);
                this._jumpOffset = 0;
                this._jumpVelocity = 0;
                this._isJumping = false;
                this._isFlipping = false;
                this._side *= -1;
                landed = true;
            }
        } else {
            if (this._jumpOffset <= 0) {
                landingImpact = Math.abs(this._jumpVelocity);
                this._jumpOffset = 0;
                this._jumpVelocity = 0;
                this._isJumping = false;
                landed = true;
            }
        }

        if (landed) this.events.emit('land', landingImpact);

        return { landed, landingImpact };
    }

    public convertToFlip() {
        if (!this._isJumping || this._isFlipping) return;
        if (sound.exists('audio/double-jump.wav')) sound.play('audio/double-jump.wav');
        this._isFlipping = true;
        this._jumpVelocity = this._jumpStrength * 2;
        this.events.emit('doubleJump');
    }

    public startFall(pos: { x: number; y: number; nx: number; ny: number }, hw: number) {
        if (this._isFalling) return;

        this._isFalling = true;
        this._hasExploded = false;
        this._isJumping = false;
        this._isFlipping = false;
        this._jumpOffset = 0;
        this._jumpVelocity = 0;
        this.events.emit('fallStart');

        this._prevFixedX = this._fixedX;
        this._prevFixedY = this._fixedY;
        this._fixedX = pos.x + pos.nx * (hw - this.radius) * this._side;
        this._fixedY = pos.y + pos.ny * (hw - this.radius) * this._side;

        const tangentX = pos.ny;
        const tangentY = -pos.nx;
        const outwardX = pos.nx * this._side;
        const outwardY = pos.ny * this._side;

        this._fallVelocityX = tangentX * 260 + outwardX * 220;
        this._fallVelocityY = tangentY * 260 + outwardY * 80 + 40;
        this._fallGravityX = this._side * 1150;
        this._fallGravityY = 320;
    }

    public explode() {
        if (this._hasExploded) return;
        if (sound.exists('audio/explosion.wav')) sound.play('audio/explosion.wav');
        this._hasExploded = true;
        this.events.emit('explode');
    }

    public positionOnTrack(pos: { x: number; y: number; nx: number; ny: number }, hw: number) {
        this._prevFixedX = this._fixedX;
        this._prevFixedY = this._fixedY;
        this._fixedX = pos.x + pos.nx * (hw - this.radius - this._jumpOffset) * this._side;
        this._fixedY = pos.y + pos.ny * (hw - this.radius - this._jumpOffset) * this._side;
    }

    public snapToTrack(pos: { x: number; y: number; nx: number; ny: number }, hw: number) {
        const x = pos.x + pos.nx * (hw - this.radius - this._jumpOffset) * this._side;
        const y = pos.y + pos.ny * (hw - this.radius - this._jumpOffset) * this._side;

        this._fixedX = x;
        this._fixedY = y;
        this._prevFixedX = x;
        this._prevFixedY = y;
        this.x = x;
        this.y = y;
        this._prevX = x;
        this._prevY = y;
    }

    public rebase(offsetX: number, offsetY: number) {
        this._fixedX -= offsetX;
        this._fixedY -= offsetY;
        this._prevFixedX -= offsetX;
        this._prevFixedY -= offsetY;
        this._prevX -= offsetX;
        this._prevY -= offsetY;
        this.x -= offsetX;
        this.y -= offsetY;
    }

    public interpolate(alpha: number) {
        this.x = this._prevFixedX + (this._fixedX - this._prevFixedX) * alpha;
        this.y = this._prevFixedY + (this._fixedY - this._prevFixedY) * alpha;
    }

    public updateRotation() {
        const dx = this.x - this._prevX;
        const dy = this.y - this._prevY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const rotationDelta = (distance / this.radius) * this._side;

        this.events.emit('frameUpdate', dx, dy, rotationDelta, this._isFlipping);

        this._prevX = this.x;
        this._prevY = this.y;
    }

    public reset() {
        this._side = 1;
        this._jumpOffset = 0;
        this._jumpVelocity = 0;
        this._isJumping = false;
        this._isFlipping = false;
        this._isFalling = false;
        this._hasExploded = false;
        this._fallVelocityX = 0;
        this._fallVelocityY = 0;
        this._fallGravityX = 0;
        this._fallGravityY = 0;
        this._prevX = 0;
        this._prevY = 0;
        this._fixedX = 0;
        this._fixedY = 0;
        this._prevFixedX = 0;
        this._prevFixedY = 0;
        this.x = 0;
        this.y = 0;
        this.events.emit('reset');
    }
}
