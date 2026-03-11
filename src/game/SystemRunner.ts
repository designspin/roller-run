import { Ticker } from "pixi.js";
import { Game } from "./index";

export interface SystemState<S = System> {
    update?: (ctx: S, interpolated: number) => void;
    fixedUpdate?: (ctx: S, fixedDelta: number) => void;
    doAction: (ctx: S) => void;
}

export interface SystemStateMachine<S = System> {
    setState: (state: SystemState<S>) => void;
    getState: () => SystemState<S>;
    switchState: (state: SystemState<S>) => void;
}

export interface System<S extends Game = Game> {
    game?: S;
    init?: () => void;
    awake?: () => void;
    start?: () => void;
    end?: () => void;
    reset?: () => void;
    fixedUpdate?: (fixedDelta: number) => void;
    update?: (interpolated: number) => void;
    rebase?: (offsetX: number, offsetY: number) => void;
    adjustProgress?: (delta: number) => void;
}

interface SystemClass<GAME extends Game = Game, SYSTEM extends System<GAME> = System<GAME>> {
    SYSTEM_ID: string;
    new(): SYSTEM;
}

export class SystemRunner {
    public readonly PHYSICS_HZ: number = 60;
    private readonly FIXED_TIMESTAMP: number;
    private accumulator: number = 0;

    private readonly _game: Game;
    public readonly allSystems: Map<string, System> = new Map();

    constructor(game: Game) {
        this._game = game;
        this.FIXED_TIMESTAMP = 1 / this.PHYSICS_HZ;
    }

    public add<S extends System>(Class: SystemClass<Game, S>): S {
        const name = Class.SYSTEM_ID;

        if(!name) throw new Error('[SystemRunner] cannot add a system without a name');

        if(this.allSystems.has(name)) {
            return this.allSystems.get(name) as S;
        }

        const system = new Class();
        system.game = this._game;
        this.allSystems.set(Class.SYSTEM_ID, system);
        return system;
    }

    public remove<S extends System>(Class: SystemClass<Game, S>): void {
        const name = Class.SYSTEM_ID;

        if(!name) throw new Error('[SystemRunner] cannot remove a system without a name');

        if(!this.allSystems.has(name)) {
            return;
        }

        const system = this.allSystems.get(name) as S;
        system.game = undefined;
        this.allSystems.delete(name);
    }

    public get<S extends System>(Class: SystemClass<Game, S>): S {
        return this.allSystems.get(Class.SYSTEM_ID) as S;
    }

    public init() {
        this.allSystems.forEach(system => system.init?.());
    }

    public async awake() {
        for(const [_, system] of this.allSystems.entries()) {
            if(system.awake) {
                await system.awake();
            }
        }
    }

    public start() {
        this.allSystems.forEach(system => system.start?.());
    }

    public update(time: Ticker) {
        const deltaSeconds = time.deltaMS / 1000;
        this.accumulator += deltaSeconds;
        let physicsStepCount = 0;

        while(this.accumulator >= this.FIXED_TIMESTAMP) {
            this.runPhysicsUpdate(this.FIXED_TIMESTAMP);
            this.accumulator -= this.FIXED_TIMESTAMP;
            physicsStepCount++;

            if(physicsStepCount > 240) {
                this.accumulator = 0;
                break;
            }
        }

        const interpolated = this.accumulator / this.FIXED_TIMESTAMP;

        this.allSystems.forEach(system => system.update?.(interpolated));
    }

    private runPhysicsUpdate(fixedDelta: number) {
        this.allSystems.forEach(system => system.fixedUpdate?.(fixedDelta));
    }

    public end() {
        this.allSystems.forEach(system => system.end?.());
    }

    public reset() {
        this.allSystems.forEach(system => system.reset?.());
    }
}