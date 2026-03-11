import type { Game } from "@/game";
import type { System } from "@/game/SystemRunner";
import { designConfig } from "@/game/designConfig";
import { InputAction } from "./InputAction";
import { Rectangle } from "pixi.js";

export class InputSystem implements System {
    public static SYSTEM_ID = 'input';
    public game!: Game;

    private _actions: InputAction[] = [];
    private _lastTapTime: number = 0;
    private _doubleTapWindow: number = 500;
    private _tapPending: boolean = false;
    private readonly _hitArea = new Rectangle();

    private onPointerDown = () => this._handleInput();
    private _onResize = () => this._syncHitArea();
    private _onKeyDown = (e: KeyboardEvent) => {
        if(e.code === 'Space' && !e.repeat) this._handleInput();
    }

    public async init() {}

    public async awake() {}

    public start() {
        this.game.stage.eventMode = 'static';
        this._syncHitArea();
        this.game.stage.hitArea = this._hitArea;
        this.game.stage.on('pointerdown', this.onPointerDown);
        designConfig.events.on('resize', this._onResize);
        window.addEventListener('keydown', this._onKeyDown);
    }

    public consume(): InputAction[] {
        const actions = this._actions;
        this._actions = [];
        return actions;
    }

    private _handleInput() {
        const now = performance.now();

        if (this._tapPending && now - this._lastTapTime < this._doubleTapWindow) {
            this._tapPending = false;
            this._actions.push(InputAction.Flip);
        } else {
            this._tapPending = true;
            this._lastTapTime = now;
            this._actions.push(InputAction.Jump);
        }
    }

    public update() {
        if (this._tapPending && performance.now() - this._lastTapTime >= this._doubleTapWindow) {
            this._tapPending = false;
        }
    }

    public end() {
        this.game.stage.off('pointerdown', this.onPointerDown);
        designConfig.events.off('resize', this._onResize);
        window.removeEventListener('keydown', this._onKeyDown);
    }

    public reset() {
        this._actions = [];
        this._tapPending = false;
    }

    private _syncHitArea() {
        this._hitArea.x = 0;
        this._hitArea.y = 0;
        this._hitArea.width = designConfig.content.width;
        this._hitArea.height = designConfig.content.height;
    }
}