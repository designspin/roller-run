import { Container, Graphics, Ticker } from "pixi.js";
import type { AppScreen } from "../navigation/AppScreen";
import { Game } from "../game";
import { RunnerSystem } from "../game/systems/RunnerSystem";
import { CheckerboardFilter } from "../shaders/CheckerboardFilter";
import { DistanceHUD } from "./overlays";

export class GameScreen extends Container implements AppScreen {
    public static SCREEN_ID = "GameScreen";
    public static assetBundles = ["game-screen"];

    private readonly _game: Game;
    private readonly _bgFilter: CheckerboardFilter;
    private _elapsed = 0;
    private _distanceHUD: DistanceHUD;

    constructor() {
        super();

        this._bgFilter = new CheckerboardFilter();

        const bg = new Graphics().rect(0, 0, 1, 1).fill(0xffffff);
        bg.width = 720;
        bg.height = 1280;
        bg.filters = [this._bgFilter];
        this.addChild(bg);

        this._game = new Game();
        this._game.init();
        this.addChild(this._game.stage);

        // Add Distance HUD overlay above the game
        this._distanceHUD = new DistanceHUD();
        this.addChild(this._distanceHUD);

        const mask = new Graphics().rect(0, 0, 720, 1280).fill(0xffffff);
        this.addChild(mask);
        this.mask = mask;
    }

    public async show() {
        await this._game.awake();

        this.alpha = 1;

        this._game.start();
    }

    public async hide() {
        this.alpha = 1;

        this._game.end();

        this._game.reset();
    }

    public update(time: Ticker) {
        this._elapsed += time.deltaTime / 60;
        this._bgFilter.time = this._elapsed;
        this._game.update(time);

        const runner = this._game.systems.get(RunnerSystem);
        this._bgFilter.scroll = -runner.centerY;

        // Update distance HUD with runner progress
        this._distanceHUD.updateDistance(runner);
    }
}