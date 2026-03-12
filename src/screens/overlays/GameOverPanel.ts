import { Container, Graphics, Text } from "pixi.js";
import { SecondaryButton } from "../../ui/buttons/SecondaryButton";
import { animate, EasingFunctions } from "../../utilities/animate";
import { designConfig } from "../../game/designConfig";

type GameOverCallback = (action: 'retry' | 'quit') => void;

const PANEL_HEIGHT = 300;

export class GameOverPanel extends Container {
    private readonly _bg: Graphics;
    private readonly _distanceTitleText: Text;
    private readonly _distanceValueText: Text;
    private readonly _retryBtn: SecondaryButton;
    private readonly _quitBtn: SecondaryButton;
    private _callback?: GameOverCallback;

    constructor() {
        super();

        this._bg = new Graphics();
        this._bg
            .roundRect(0, 0, designConfig.content.width, PANEL_HEIGHT + 40, 32)
            .fill({ color: 0x0d0d1a, alpha: 0.96 });
        this.addChild(this._bg);

        this._distanceTitleText = new Text({
            text: "DISTANCE",
            style: {
                fontFamily: "BebasNeue Regular",
                fontSize: 28,
                fill: 0x88aacc,
                align: "center",
            },
        });
        this._distanceTitleText.anchor.set(0.5, 0);
        this._distanceTitleText.x = designConfig.content.width / 2;
        this._distanceTitleText.y = 28;
        this.addChild(this._distanceTitleText);

        this._distanceValueText = new Text({
            text: "0 m",
            style: {
                fontFamily: "Bungee Regular",
                fontSize: 80,
                fill: 0xffffff,
                align: "center",
                stroke: { color: 0x0d6b32, width: 8 },
                dropShadow: { color: 0x000000, blur: 0, angle: 0, distance: 3, alpha: 0.8 },
            },
        });
        this._distanceValueText.anchor.set(0.5, 0);
        this._distanceValueText.x = designConfig.content.width / 2;
        this._distanceValueText.y = 62;
        this.addChild(this._distanceValueText);

        this._retryBtn = new SecondaryButton({
            text: "TRY AGAIN",
            tint: 0x4caf50,
            textStyle: { fontFamily: "BebasNeue Regular", fontSize: 56, fontWeight: "bold", align: "center" },
            buttonOptions: { scale: 0.6 },
        });
        this._retryBtn.anchor.set(0.5);
        this._retryBtn.x = designConfig.content.width * 0.3;
        this._retryBtn.y = 218;
        this._retryBtn.onPress.connect(() => this._callback?.('retry'));
        this.addChild(this._retryBtn);

        this._quitBtn = new SecondaryButton({
            text: "QUIT",
            tint: 0xe53935,
            textStyle: { fontFamily: "BebasNeue Regular", fontSize: 56, fontWeight: "bold", align: "center" },
            buttonOptions: { scale: 0.6 },
        });
        this._quitBtn.anchor.set(0.5);
        this._quitBtn.x = designConfig.content.width * 0.7;
        this._quitBtn.y = 218;
        this._quitBtn.onPress.connect(() => this._callback?.('quit'));
        this.addChild(this._quitBtn);

        this.y = designConfig.content.height;
    }

    public prepare(distance: number, callback: GameOverCallback) {
        this._distanceValueText.text = `${Math.floor(distance)} m`;
        this._callback = callback;
        this.y = designConfig.content.height;
    }

    public slideIn() {
        const targetY = designConfig.content.height - PANEL_HEIGHT;
        return animate((progress) => {
            this.y = targetY * progress;
        }, 450, EasingFunctions.easeOutCubic);
    }

    public slideOut() {
        const startY = this.y;
        const distance = designConfig.content.height - startY;
        return animate((progress) => {
            this.y = startY + distance * progress;
        }, 300, EasingFunctions.easeInCubic);
    }
}
