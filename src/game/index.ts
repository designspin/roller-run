import { Container, Ticker } from "pixi.js";
import { SystemRunner } from "./SystemRunner";
import { PauseSystem } from "./systems/PauseSystem";
import { TrackSystem } from "./systems/TrackSystem";
import { RunnerSystem } from "./systems/RunnerSystem";
import { InputSystem } from "./systems/InputSystem/input";
import { ParticleSystem } from "./systems/ParticleSystem";
import { CollectibleSystem } from "./systems/CollectibleSystem";
import { SparkSystem } from "./systems/SparkSystem";
import { BlockerSystem } from "./systems/BlockerSystem";
import type { SeededRandom } from "@/utilities/seededRandom";

export class Game {
    public stage = new Container();
    public gameContainer = new Container();
    public uiContainer = new Container();
    public systems: SystemRunner;
    public rng!: SeededRandom;

    constructor() {
        this.stage.addChild(this.gameContainer, this.uiContainer);
        this.systems = new SystemRunner(this);
    }

    public addToGame(...views: Container[]) {
        views.forEach(view => this.gameContainer.addChild(view));
    }

    public removeFromGame(...views: Container[]) {
        views.forEach(view => this.gameContainer.removeChild(view));
    }

    public async init() {
        this.systems.add(PauseSystem);
        this.systems.add(TrackSystem);
        this.systems.add(InputSystem);
        this.systems.add(RunnerSystem);
        this.systems.add(ParticleSystem);
        this.systems.add(CollectibleSystem);
        this.systems.add(SparkSystem);
        this.systems.add(BlockerSystem);
        await this.systems.init();
    }

    public async awake() {
        await this.systems.awake();
        this.gameContainer.visible = true;
    }

    public async start() {
        this.systems.start();
    }

    public async end() {
        this.systems.end();
    }

    public update(time: Ticker) {
        if(this.systems.get(PauseSystem).isPaused) return;
        this.systems.update(time);
    }

    public reset() {
        this.systems.reset();
    }
}