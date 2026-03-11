import { navigation } from "@/navigation";
import { PauseOverlay } from "@/screens/overlays/PauseOverlay";
import { Game } from "../index";
import type { System } from "../SystemRunner";
import { RunnerSystem } from "./RunnerSystem";

export class PauseSystem implements System {
    public static SYSTEM_ID = 'pause';
    public game!: Game;
    public isPaused = false;

    private _visibilityPauseBound!: () => void;

    public start() {
        this._visibilityPauseBound = this._visibilityPause.bind(this);
        document.addEventListener('visibilitychange', this._visibilityPauseBound);
    }

    public end() {
        document.removeEventListener('visibilitychange', this._visibilityPauseBound);
    }

    public reset() {
        this.isPaused = false;
    }

    public pause() {
        this.isPaused = true;

        const runner = this.game.systems.get(RunnerSystem);
        navigation.showOverlay(PauseOverlay, {
            score: Math.floor(runner.totalProgress),
            callback: this._pauseCallback.bind(this),
        });
    }

    public resume() {
        this.isPaused = false;
    }

    private _visibilityPause() {
        if (document.visibilityState !== 'visible') {
            if (!this.isPaused) this.pause();
        }
    }

    private async _pauseCallback(state: 'quit' | 'resume') {
        await navigation.hideOverlay();

        if (state === 'resume') this.resume();
        else {
            this.game.reset();
        }
    }
}
