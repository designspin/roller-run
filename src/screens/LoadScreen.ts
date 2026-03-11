import { Assets, Container, Sprite, Texture, Ticker } from "pixi.js";
import type { AppScreen } from "@/navigation/AppScreen";
import { designConfig } from "@/game/designConfig";

export class LoadScreen extends Container implements AppScreen {
    public static SCREEN_ID = "loader";
    public static assetBundles: string[] = ['preload'];

    private readonly _spinner: Sprite;

    constructor() {
        super();

        this._spinner = new Sprite(Texture.EMPTY);
        this._spinner.anchor.set(0.5);
        this.addChild(this._spinner);

        this._layout();
    }

    public async show() {
        const texture = Assets.get<Texture>("images/preload/loading.png")
            ?? await Assets.load<Texture>("images/preload/loading.png");

        this._spinner.texture = texture;
        this.visible = true;
        this.alpha = 1;
        this._layout();
        this._spinner.rotation = 0;
    }

    public hide() {
        this.visible = false;
    }

    public update(time: Ticker) {
        this._spinner.rotation += 0.08 * (time.deltaTime / 1);
    }

    private _layout() {
        this._spinner.x = designConfig.content.width * 0.5;
        this._spinner.y = designConfig.content.height * 0.5;
    }
}