import { Container, Graphics, Ticker } from "pixi.js";
import type { AppScreen } from "../navigation/AppScreen";
import { Game } from "../game";
import { RunnerSystem } from "../game/systems/RunnerSystem";
import { CheckerboardFilter } from "../shaders/CheckerboardFilter";
import { DistanceHUD } from "./overlays";
import { GameOverPanel } from "./overlays/GameOverPanel";
import { navigation } from "../navigation";
import { TitleScreen } from "./TitleScreen";

export class GameScreen extends Container implements AppScreen {
    public static SCREEN_ID = "GameScreen";
    public static assetBundles = ["game-screen"];

    private readonly _game: Game;
    private readonly _bgFilter: CheckerboardFilter;
    private readonly _distanceHUD: DistanceHUD;
    private readonly _gameOverPanel: GameOverPanel;
    private _elapsed = 0;
    private _bgScrollAccum = 0;
    private _bgPrevCenterY: number | null = null;
    private _gameOverShown = false;
    private _gameOverTimer = 0;

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
        this._game.onQuit = () => navigation.gotoScreen(TitleScreen);
        this.addChild(this._game.stage);

        this._distanceHUD = new DistanceHUD();
        this.addChild(this._distanceHUD);

        this._gameOverPanel = new GameOverPanel();
        this.addChild(this._gameOverPanel);

        const mask = new Graphics().rect(0, 0, 720, 1280).fill(0xffffff);
        this.addChild(mask);
        this.mask = mask;
    }

    public async show() {
        await this._game.awake();

        this.alpha = 1;
        this._bgScrollAccum = 0;
        this._bgPrevCenterY = null;
        this._gameOverShown = false;
        this._gameOverTimer = 0;

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

        // Accumulate scroll delta rather than using absolute centerY,
        // so world rebase jumps don't cause a visible shader jolt.
        const cy = runner.centerY;
        if (this._bgPrevCenterY !== null) {
            const delta = cy - this._bgPrevCenterY;
            // Normal per-frame deltas are <20 units; rebase jumps are ~10000.
            if (Math.abs(delta) < 500) {
                this._bgScrollAccum -= delta;
            }
        }
        this._bgPrevCenterY = cy;
        this._bgFilter.scroll = this._bgScrollAccum;

        this._distanceHUD.updateDistance(runner);

        // Show game-over panel after ball has exploded
        if (runner.isDead && runner.ball.hasExploded && !this._gameOverShown) {
            this._gameOverTimer += time.deltaTime / 60;
            if (this._gameOverTimer >= 0.8) {
                this._gameOverShown = true;
                this._gameOverPanel.prepare(runner.totalProgress, (action) => {
                    this._onGameOver(action);
                });
                this._gameOverPanel.slideIn();
            }
        }
    }

    private async _onGameOver(action: 'retry' | 'quit') {
        await this._gameOverPanel.slideOut();
        if (action === 'retry') {
            this._game.end();
            this._game.reset();
            this._bgScrollAccum = 0;
            this._bgPrevCenterY = null;
            this._gameOverShown = false;
            this._gameOverTimer = 0;
            this._game.start();
        } else {
            navigation.gotoScreen(TitleScreen);
        }
    }
}
