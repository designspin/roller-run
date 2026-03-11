import type { RunnerSystem } from ".";
import type { SystemState } from "@/game/SystemRunner";
import { designConfig } from "@/game/designConfig";
import { animate, EasingFunctions } from "@/utilities/animate";
import { Container, Text } from "pixi.js";
import { RunningState } from "./RunningState";
import { sound } from "@pixi/sound";

export class ReadyState implements SystemState<RunnerSystem> {
    private static readonly STEP_DURATION = 0.7;
    private static readonly LABELS = ["3", "2", "1", "ROLL"];
    private static readonly BASE_Y = designConfig.content.height * 0.45;

    private _elapsed = 0;
    private _index = -1;
    private _label: string | null = null;
    private _container?: Container;
    private _text?: Text;
    private _animToken = 0;

    public get label() {
        return this._label;
    }

    public update(_ctx: RunnerSystem, _interpolated: number) {}

    public fixedUpdate(ctx: RunnerSystem, fixedDelta: number) {
        this._elapsed += fixedDelta;
        ctx.clearQueuedInput();
        ctx.snapToTrack();

        const nextIndex = Math.min(
            ReadyState.LABELS.length - 1,
            Math.floor(this._elapsed / ReadyState.STEP_DURATION),
        );

        if (nextIndex !== this._index) {
            this._index = nextIndex;
            this._label = ReadyState.LABELS[this._index];
            this._playBeat();
        }

        const totalDuration = ReadyState.STEP_DURATION * ReadyState.LABELS.length;
        if (this._elapsed >= totalDuration) {
            this._label = null;
            this.cleanup();
            ctx.switchState(new RunningState());
        }
    }

    public doAction(ctx: RunnerSystem) {
        this._elapsed = 0;
        this._index = 0;
        this._label = ReadyState.LABELS[this._index];
        ctx.clearQueuedInput();
        ctx.snapToTrack();
        this._ensureMounted(ctx);
        this._playBeat();
    }

    public cleanup() {
        this._animToken++;

        if (this._container?.parent) {
            this._container.parent.removeChild(this._container);
        }

        this._container?.destroy({ children: true });
        this._container = undefined;
        this._text = undefined;
    }

    private _ensureMounted(ctx: RunnerSystem) {
        if (this._container) {
            return;
        }

        this._container = new Container();
        this._container.x = designConfig.content.width * 0.5;
        this._container.y = ReadyState.BASE_Y;

        this._text = new Text({
            text: "",
            style: {
                fontFamily: "Bungee Regular",
                fontSize: 144,
                fill: 0xffffff,
                stroke: {
                    color: 0x0d6b32,
                    width: 10,
                },
                align: "center",
                letterSpacing: 2,
            },
        });
        this._text.anchor.set(0.5);
        this._text.visible = false;
        this._container.addChild(this._text);
        ctx.game.uiContainer.addChild(this._container);
    }

    private _applyLabelStyle() {
        if (!this._text || !this._label) {
            return;
        }

        const isFinal = this._label === ReadyState.LABELS[ReadyState.LABELS.length - 1];
        this._text.style.letterSpacing = isFinal ? 10 : 2;
        this._text.style.stroke = {
            color: isFinal ? 0x16a34a : 0x0d6b32,
            width: isFinal ? 12 : 10,
        };
    }

    private _playBeat() {
        if (!this._text || !this._label) {
            return;
        }
        if(sound.exists(`audio/start${this._index + 1}.wav`)) {
            sound.play(`audio/start${this._index + 1}.wav`);
        }
        const token = ++this._animToken;
        const isFinal = this._label === ReadyState.LABELS[ReadyState.LABELS.length - 1];

        this._text.text = this._label;
        this._applyLabelStyle();
        this._text.visible = true;
        this._text.alpha = 0;
        this._text.scale.set(isFinal ? 1.2 : 1.35);
        this._text.y = 24;
        this._text.rotation = isFinal ? 0 : -0.05;

        void animate((progress) => {
            if (token !== this._animToken || !this._text) {
                return;
            }

            this._text.alpha = progress;
            this._text.scale.set((isFinal ? 1.2 : 1.35) + (1 - (isFinal ? 1.2 : 1.35)) * progress);
            this._text.y = 24 * (1 - progress);
            this._text.rotation = isFinal ? 0 : -0.05 * (1 - progress);
        }, isFinal ? 280 : 240, isFinal ? EasingFunctions.easeOutElastic : EasingFunctions.easeOutCubic).then(() => {
            if (token !== this._animToken || !this._text) {
                return;
            }

            return animate((progress) => {
                if (token !== this._animToken || !this._text) {
                    return;
                }

                this._text.alpha = 1 - progress;
                this._text.scale.set(1 + (isFinal ? 0.14 : -0.08) * progress);
                this._text.y = -18 * progress;
            }, isFinal ? 220 : 160, EasingFunctions.easeInCubic);
        }).then(() => {
            if (token !== this._animToken || !this._text) {
                return;
            }

            this._text.visible = false;
        });
    }
}