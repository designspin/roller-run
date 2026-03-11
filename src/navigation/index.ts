import type { AppScreen } from "./AppScreen";
import type { AppScreenCtor } from "./AppScreenCtor";
import { areBundlesLoaded } from "@/assets";
import { Container, Assets } from "pixi.js";

import { app, gameContainer } from "../main";

class Navigation
{
    public screenView = new Container();
    public overlayView = new Container();
    public currentScreen?: AppScreen;
    private loadScreen?: AppScreen;
    private currentOverlay?: AppScreen;
    private readonly _screenMap = new Map<string, AppScreen>();

    public init() {
        gameContainer.addChild(this.screenView, this.overlayView);
    }

    public setLoadScreen(Ctor: AppScreenCtor) {
        this.loadScreen = this._getScreen(Ctor);
    }

    public async showOverlay<T>(Ctor: AppScreenCtor, data?: T) {
        this._showScreen(Ctor, true, data);
    }

    public async gotoScreen<T>(Ctor: AppScreenCtor, data?: T) {
        this._showScreen(Ctor, false, data);
    }

    public async hideOverlay(){
        if(!this.currentOverlay) return;

        this._removeScreen(this.currentOverlay);
    }

    private _getScreen(Ctor: AppScreenCtor) {
        let screen = this._screenMap.get(Ctor.SCREEN_ID);
        if(!screen)
        {
            screen = new Ctor();
            this._screenMap.set(Ctor.SCREEN_ID, screen);
        }
        return screen;
    }

    private async _addScreen(screen: AppScreen, isOverlay = false) {

        (isOverlay ? this.overlayView : this.screenView).addChild(screen);

        if(screen.update) {
            app.ticker.add(screen.update, screen);
        }

        if(screen.show) {
            await screen.show();
        }
    }

    private async _removeScreen(screen: AppScreen) {
        if(screen.hide) {
            await screen.hide();
        }

        if(screen.update) {
            app.ticker.remove(screen.update, screen);
        }

        if(screen.parent) {
            screen.parent.removeChild(screen);
        }
    }

    private async _showScreen<T>(Ctor: AppScreenCtor, isOverlay: boolean, data: T) {
        const current = isOverlay ? this.currentOverlay : this.currentScreen;

        if(current) {
            await this._removeScreen(current);
        }

        if(Ctor.assetBundles && !areBundlesLoaded(Ctor.assetBundles)) {
            if(this.loadScreen) {
                this._addScreen(this.loadScreen, isOverlay);
            }

            await Assets.loadBundle(Ctor.assetBundles);

            if(this.loadScreen) {
                this._removeScreen(this.loadScreen);
            }
        }

        if(isOverlay) {
            this.currentOverlay = this._getScreen(Ctor);
            this.currentOverlay.prepare?.(data);
            await this._addScreen(this.currentOverlay, isOverlay);
        } else {
            this.currentScreen = this._getScreen(Ctor);
            this.currentScreen.prepare?.(data);
            await this._addScreen(this.currentScreen, isOverlay);
        }
    }
}

export const navigation = new Navigation();