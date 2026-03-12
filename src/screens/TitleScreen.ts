import { Container, Graphics, Sprite, Ticker } from "pixi.js";
import type { AppScreen } from "@/navigation/AppScreen";
import { designConfig } from "@/game/designConfig";
import { animate, EasingFunctions } from "@/utilities/animate";
import { SecondaryButton } from "@/ui/buttons/SecondaryButton";
import { GameScreen } from "./GameScreen";
import { navigation } from "@/navigation";
import { backgroundContainer } from "@/main";
import { CheckerboardFilter } from "@/shaders/CheckerboardFilter";

export class TitleScreen extends Container implements AppScreen {
    public static SCREEN_ID = 'title';
    public static assetBundles = ['title-screen'];

    private _titleA: Sprite;
    private _titleB: Sprite;
    private _playBtn: SecondaryButton;

    private _topAnimContainer = new Container();
    private _bottomAnimContainer = new Container();

    private _bg = new Graphics();
    private _checkerFilter = new CheckerboardFilter();
    private _onResize = () => this._resizeBg();

    constructor() {
        super();

        this._titleA = Sprite.from("Roller.png");
        this._titleA.anchor.set(0.5);

        this._titleB = Sprite.from("Run.png");
        this._titleB.anchor.set(0.5);

        this._topAnimContainer.addChild(this._titleA, this._titleB);

        this._playBtn = new SecondaryButton({
            text: 'PLAY',
            tint: 0x00c853,
        });
        this._playBtn.anchor.set(0.5);
        this._playBtn.onPress.connect(() => {
            this._playBtn.enabled = false;
            navigation.gotoScreen(GameScreen);
        });

        this._bottomAnimContainer.addChild(this._playBtn);

        this.addChild(this._topAnimContainer, this._bottomAnimContainer);
    }

    public prepare() {
        this._playBtn.enabled = true;
        this._topAnimContainer.alpha = 0;
        this._bottomAnimContainer.alpha = 0;
    }

    public async show() {
        this._layout();

        this._bg.clear();
        this._bg.rect(0, 0, window.innerWidth, window.innerHeight);
        this._bg.fill(0x000000);
        this._bg.filters = [this._checkerFilter];
        backgroundContainer.addChild(this._bg);
        backgroundContainer.visible = true;
        window.addEventListener('resize', this._onResize);

        const cx = designConfig.content.width / 2;
        const startLeft = -this._titleA.width;
        const startRight = designConfig.content.width + this._titleB.width;

        this._topAnimContainer.alpha = 1;
        this._bottomAnimContainer.alpha = 0;
        this._titleA.alpha = 0;
        this._titleB.alpha = 0;

        const roller = animate((progress) => {
            this._titleA.alpha = progress;
            this._titleA.x = startLeft + (cx - startLeft) * progress;
        }, 800, EasingFunctions.easeOutElastic);

        const run = roller.then(() =>
            animate((progress) => {
                this._titleB.alpha = progress;
                this._titleB.x = startRight + (cx - startRight) * progress;
            }, 800, EasingFunctions.easeOutElastic)
        );

        const bottom = animate((progress) => {
            this._bottomAnimContainer.alpha = progress;
        }, 600, EasingFunctions.easeOutQuad);

        return await Promise.all([run, bottom]);
    }

    public async hide() {
        const cx = designConfig.content.width / 2;
        const endLeft = -this._titleA.width;
        const endRight = designConfig.content.width + this._titleB.width;

        const top = animate((progress) => {
            this._titleA.x = cx + (endLeft - cx) * progress;
            this._titleB.x = cx + (endRight - cx) * progress;
            this._topAnimContainer.alpha = 1 - progress;
        }, 500, EasingFunctions.easeInOutQuad);

        const bottom = animate((progress) => {
            this._bottomAnimContainer.alpha = 1 - progress;
        }, 500, EasingFunctions.easeInOutCubic);

        backgroundContainer.visible = false;
        backgroundContainer.removeChild(this._bg);
        window.removeEventListener('resize', this._onResize);

        return await Promise.all([top, bottom]);
    }

    private _layout() {
        const cx = designConfig.content.width / 2;
        const cy = designConfig.content.height / 2;
        const margin = 40;
        const maxWidth = designConfig.content.width - margin * 2;

        // Scale down sprites if they exceed available width
        const rollerScale = Math.min(1, maxWidth / this._titleA.texture.width);
        this._titleA.scale.set(rollerScale);
        this._titleB.scale.set(rollerScale);

        const gap = 10;
        const totalHeight = this._titleA.height + gap + this._titleB.height;
        const topY = cy - totalHeight / 2 + this._titleA.height / 2;

        this._titleA.x = cx;
        this._titleA.y = topY;
        this._titleB.x = cx;
        this._titleB.y = topY + this._titleA.height / 2 + gap + this._titleB.height / 2;
        this._playBtn.x = cx;
        this._playBtn.y = this._titleB.y + this._titleB.height / 2 + 60;
    }

    private _resizeBg() {
        this._bg.clear();
        this._bg.rect(0, 0, window.innerWidth, window.innerHeight);
        this._bg.fill(0x000000);
    }

    public update(time: Ticker) {
        this._checkerFilter.time += time.deltaTime / 60;
    }
}