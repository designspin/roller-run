import { EventEmitter } from "pixi.js";

const resizeEmitter = new EventEmitter();

export const designConfig = {
    content: {
        width: 720,
        height: 1280,
    },
    ball: {
        radius: 32,
    },
    events: resizeEmitter,
    resize(screenWidth: number, screenHeight: number) {
        const aspect = screenHeight / screenWidth;
        this.content.height = Math.round(this.content.width * aspect);
        this.events.emit('resize', this.content.width, this.content.height);      
    }
};