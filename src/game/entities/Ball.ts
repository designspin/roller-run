import { animate, EasingFunctions } from "@/utilities/animate";
import { Container, Sprite } from "pixi.js";
import { sound } from "@pixi/sound";

export type BallPhysicsResult = {
    landed: boolean;
    landingImpact: number;
};

export class Ball extends Container {
    private _visual: Container;
    private _sprite: Sprite;
    private _gloss: Sprite;
    private _juiceToken: number = 0;

    private _jumpOffset: number = 0;
    private _jumpVelocity: number = 0;
    private _isJumping: boolean = false;
    private _isFlipping: boolean = false;
    private _gravity: number = 800;
    private _jumpStrength: number = 500;
    private _side: number = 1;
    private _prevX: number = 0;
    private _prevY: number = 0;

    private _fixedX: number = 0;
    private _fixedY: number = 0;
    private _prevFixedX: number = 0;
    private _prevFixedY: number = 0;
    private _isFalling: boolean = false;
    private _hasExploded: boolean = false;
    private _fallVelocityX: number = 0;
    private _fallVelocityY: number = 0;
    private _fallGravityX: number = 0;
    private _fallGravityY: number = 0;

    get side() { return this._side; }
    get isJumping() { return this._isJumping; }
    get isFalling() { return this._isFalling; }
    get hasExploded() { return this._hasExploded; }
    get fallVelocityX() { return this._fallVelocityX; }
    get fallVelocityY() { return this._fallVelocityY; }
    get jumpOffset() { return this._jumpOffset; }
    get radius() { return this._sprite.width / 2; }
    get fixedX() { return this._fixedX; }
    get fixedY() { return this._fixedY; }

    constructor() {
        super();
        this._visual = new Container();
        this.addChild(this._visual);

        this._sprite = Sprite.from("ball.png");
        this._sprite.anchor.set(0.5);
        this._visual.addChild(this._sprite);

        this._gloss = Sprite.from("ball-gloss.png");
        this._gloss.anchor.set(0.5);
        this._gloss.scale.set(0.95);
        this._visual.addChild(this._gloss);
    }

    public startJump() {
        if (this._isJumping) return;
        if(sound.exists('audio/jump.wav')) {
            sound.play('audio/jump.wav');
        }
        this._isJumping = true;
        this._isFlipping = false;
        this._jumpVelocity = this._jumpStrength;
        this._playLaunchJuice(1);
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

        if (landed) {
            this._playLandingJuice(landingImpact);
        }

        return { landed, landingImpact };
    }

    public convertToFlip() {
        if (!this._isJumping || this._isFlipping) return;
        if(sound.exists('audio/double-jump.wav')) {
            sound.play('audio/double-jump.wav');
        }
        this._isFlipping = true;
        this._jumpVelocity = this._jumpStrength * 2;
        this._playLaunchJuice(1.15);
    }

    public startFall(pos: { x: number; y: number; nx: number; ny: number }, hw: number) {
        if (this._isFalling) return;

        this._isFalling = true;
        this._hasExploded = false;
        this._isJumping = false;
        this._isFlipping = false;
        this._jumpOffset = 0;
        this._jumpVelocity = 0;
        this._sprite.visible = true;
        this._gloss.visible = true;

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
        if(sound.exists('audio/explosion.wav')) {
            sound.play('audio/explosion.wav');
        }
        this._hasExploded = true;
        this._sprite.visible = false;
        this._gloss.visible = false;
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

        this._sprite.rotation += (distance / this.radius) * this._side;

        this._prevX = this.x;
        this._prevY = this.y;
    }

    public reset() {
        this._juiceToken++;
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
        this._sprite.visible = true;
        this._gloss.visible = true;
        this._sprite.rotation = 0;
        this._applyScales(1, 1);
    }

    private _applyScales(scaleX: number, scaleY: number) {
        this._visual.scale.set(scaleX, scaleY);
    }

    private _playLaunchJuice(intensity: number) {
        const token = ++this._juiceToken;
        const stretch = Math.min(1.18, 1 + 0.12 * intensity);
        const squash = Math.max(0.84, 1 - 0.1 * intensity);

        this._applyScales(squash, stretch);

        void animate(
            (t) => {
                if (token !== this._juiceToken) return;

                const scaleX = squash + (1 - squash) * t;
                const scaleY = stretch + (1 - stretch) * t;
                this._applyScales(scaleX, scaleY);
            },
            170,
            EasingFunctions.easeOutCubic,
        );
    }

    private _playLandingJuice(impactSpeed: number) {
        const token = ++this._juiceToken;
        const intensity = Math.min(1, impactSpeed / 700);
        const squashX = 1 + 0.22 * intensity;
        const squashY = 1 - 0.24 * intensity;
        const reboundX = 1 - 0.08 * intensity;
        const reboundY = 1 + 0.1 * intensity;

        this._applyScales(squashX, squashY);

        void animate(
            (t) => {
                if (token !== this._juiceToken) return;

                const scaleX = squashX + (reboundX - squashX) * t;
                const scaleY = squashY + (reboundY - squashY) * t;
                this._applyScales(scaleX, scaleY);
            },
            90,
            EasingFunctions.easeOutQuad,
        ).then(() => {
            if (token !== this._juiceToken) return;

            void animate(
                (t) => {
                    if (token !== this._juiceToken) return;

                    const scaleX = reboundX + (1 - reboundX) * t;
                    const scaleY = reboundY + (1 - reboundY) * t;
                    this._applyScales(scaleX, scaleY);
                },
                150,
                EasingFunctions.easeOutCubic,
            );
        });
    }
}