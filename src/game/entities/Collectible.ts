import { Container, Sprite } from "pixi.js";
import { animate, EasingFunctions } from "@/utilities/animate";

export class Collectible extends Container {
    public sprite: Sprite;
    public active: boolean = false;

    private _juiceToken: number = 0;

    private _prevX = 0;
    private _prevY = 0;
    private _x = 0;
    private _y = 0;

    constructor(textureName = 'collectible.png') {
        super();
        this.sprite = Sprite.from(textureName);
        this.sprite.anchor.set(0.5);
        this.sprite.blendMode = 'add';
        this.addChild(this.sprite);
    }

    get prevX() { return this._prevX; }
    get prevY() { return this._prevY; }
    get xFixed() { return this._x; }
    get yFixed() { return this._y; }

    public place(x: number, y: number) {
        this._prevX = this._x = x;
        this._prevY = this._y = y;
        this.x = x;
        this.y = y;
        this.active = true;
        this.visible = true;

        // start subtle pulse/glow animation
        const token = ++this._juiceToken;
        const minScale = 0.92;
        const maxScale = 1.12;

        void (async () => {
            while (token === this._juiceToken && this.active) {
                await animate((t) => {
                    const s = minScale + (maxScale - minScale) * t;
                    this.sprite.scale.set(s);
                }, 700, EasingFunctions.easeInOutQuad);

                if (token !== this._juiceToken || !this.active) break;

                await animate((t) => {
                    const s = maxScale + (1 - maxScale) * t;
                    this.sprite.scale.set(s);
                }, 900, EasingFunctions.easeOutCubic);
            }
            // restore to default when stopping
            if (token === this._juiceToken) this.sprite.scale.set(1);
        })();
    }

    public clear() {
        this._juiceToken++;
        this.active = false;
        this.visible = false;
        this.sprite.scale.set(1);
    }

    public rebase(offsetX: number, offsetY: number) {
        this._prevX -= offsetX;
        this._prevY -= offsetY;
        this._x -= offsetX;
        this._y -= offsetY;
    }

    public interpolate(alpha: number) {
        this.x = this._prevX + (this._x - this._prevX) * alpha;
        this.y = this._prevY + (this._y - this._prevY) * alpha;
    }

    public fixedUpdate(newX: number, newY: number) {
        this._prevX = this._x;
        this._prevY = this._y;
        this._x = newX;
        this._y = newY;
    }
}
