import { Container, Ticker } from 'pixi.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AppScreen<T = any> extends Container {
    prepare?: (data?: T) => void;
    show?: () => void;
    hide?: () => void;
    update?: (time: Ticker) => void;
}