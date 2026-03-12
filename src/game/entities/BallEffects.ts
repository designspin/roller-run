import { animate, EasingFunctions } from "@/utilities/animate";
import { Container, Graphics, Sprite } from "pixi.js";
import { Ball } from "./Ball";
import { designConfig } from "@/game/designConfig";

type GhostRecord = { container: Container; sprite: Sprite; alpha: number; active: boolean };

export class BallEffects extends Container {
    private _visual: Container;
    private _sprite: Sprite;
    private _gloss: Sprite;
    private _juiceToken = 0;
    private _shockwave: Graphics;
    private _shockwaveToken = 0;
    private _ghostPool: GhostRecord[];
    private _ghostSampleTimer = 0;

    get radius(): number { return designConfig.ball.radius; }

    constructor(ball: Ball) {
        super();

        this._shockwave = new Graphics();
        this._shockwave.visible = false;
        this.addChild(this._shockwave);

        this._ghostPool = [];
        const ghostContainer = new Container();
        this.addChild(ghostContainer);
        for (let i = 0; i < 8; i++) {
            const sprite = Sprite.from('ball.png');
            sprite.anchor.set(0.5);
            sprite.tint = 0x88ccff;
            const container = new Container();
            container.addChild(sprite);
            container.visible = false;
            ghostContainer.addChild(container);
            this._ghostPool.push({ container, sprite, alpha: 0, active: false });
        }

        this._visual = new Container();
        this.addChild(this._visual);

        this._sprite = Sprite.from("ball.png");
        this._sprite.anchor.set(0.5);
        this._visual.addChild(this._sprite);

        this._gloss = Sprite.from("ball-gloss.png");
        this._gloss.anchor.set(0.5);
        this._gloss.scale.set(0.95);
        this._visual.addChild(this._gloss);

        ball.events.on('jump', () => this._playLaunchJuice(1));
        ball.events.on('doubleJump', () => { this._ghostSampleTimer = 0; this._playDoubleJumpJuice(); });
        ball.events.on('land', (impact) => this._playLandingJuice(impact));
        ball.events.on('fallStart', () => this._setVisible(true));
        ball.events.on('explode', () => this._setVisible(false));
        ball.events.on('reset', () => this._reset());
        ball.events.on('frameUpdate', (dx, dy, rotationDelta, isFlipping) =>
            this._update(dx, dy, rotationDelta, isFlipping));
    }

    private _update(dx: number, dy: number, rotationDelta: number, isFlipping: boolean) {
        this._sprite.rotation += rotationDelta;

        for (const ghost of this._ghostPool) {
            if (!ghost.active) continue;
            ghost.container.x -= dx;
            ghost.container.y -= dy;
            ghost.alpha -= 0.055;
            if (ghost.alpha <= 0) {
                ghost.active = false;
                ghost.container.visible = false;
            } else {
                ghost.container.alpha = ghost.alpha;
            }
        }

        if (isFlipping) {
            this._ghostSampleTimer++;
            if (this._ghostSampleTimer >= 3) {
                this._ghostSampleTimer = 0;
                const ghost = this._ghostPool.find(g => !g.active);
                if (ghost) {
                    ghost.container.x = 0;
                    ghost.container.y = 0;
                    ghost.sprite.rotation = this._sprite.rotation;
                    ghost.alpha = 0.55;
                    ghost.container.alpha = 0.55;
                    ghost.active = true;
                    ghost.container.visible = true;
                }
            }
        }
    }

    private _setVisible(visible: boolean) {
        this._sprite.visible = visible;
        this._gloss.visible = visible;
    }

    private _reset() {
        this._juiceToken++;
        this._sprite.visible = true;
        this._gloss.visible = true;
        this._sprite.rotation = 0;
        this._applyScales(1, 1);
        this._shockwaveToken++;
        this._shockwave.visible = false;
        this._ghostSampleTimer = 0;
        for (const ghost of this._ghostPool) {
            ghost.active = false;
            ghost.container.visible = false;
        }
    }

    private _applyScales(scaleX: number, scaleY: number) {
        this._visual.scale.set(scaleX, scaleY);
    }

    private _playDoubleJumpJuice() {
        const token = ++this._juiceToken;
        const peak = 1.3;

        this._applyScales(peak, peak);

        void animate(
            (t) => {
                if (token !== this._juiceToken) return;
                const s = peak + (1 - peak) * t;
                this._applyScales(s, s);
            },
            220,
            EasingFunctions.easeOutElastic,
        );

        const shockToken = ++this._shockwaveToken;
        this._shockwave.visible = true;
        void animate((t) => {
            if (shockToken !== this._shockwaveToken) {
                this._shockwave.visible = false;
                return;
            }
            const r = this.radius * (1 + 2.5 * t);
            const a = 0.7 * (1 - t);
            const w = 4 * (1 - t * 0.7);
            this._shockwave.clear();
            this._shockwave.circle(0, 0, r);
            this._shockwave.stroke({ color: 0xaaddff, alpha: a, width: w });
        }, 350, EasingFunctions.easeOutQuad).then(() => {
            if (shockToken === this._shockwaveToken) this._shockwave.visible = false;
        });
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
