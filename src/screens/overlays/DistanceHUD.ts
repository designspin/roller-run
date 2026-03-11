import { Container, Text } from "pixi.js";
import { RunnerSystem } from "@/game/systems/RunnerSystem";

export class DistanceHUD extends Container {
    private _label: Text;
    private _distance: number = 0;

    constructor() {
        super();
        this._label = new Text({
            text: "0 m",
            style: {
                fontFamily: "Bungee Regular",
                fontWeight: "bold",
                fontSize: 64,
                fill: 0xffffff,
                align: "center",
                stroke: {
                    color: 0x0d6b32,
                    width: 8,
                },
                dropShadow: {
                    color: 0x444444,
                    blur: 0,
                    angle: 0,
                    distance: 2,
                    alpha: 1
                },
            },
        });
        this._label.anchor.set(0.5, 0);
        this._label.x = 360;
        this._label.y = 32;
        this.addChild(this._label);
    }

    public updateDistance(runner: RunnerSystem) {
        const meters = Math.floor(runner.totalProgress);
        if (meters !== this._distance) {
            this._distance = meters;
            this._label.text = `${meters} m`;
        }
    }
}
