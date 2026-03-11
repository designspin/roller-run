import { type AppScreen } from "./AppScreen";

export interface AppScreenCtor {
    readonly SCREEN_ID: string;
    readonly assetBundles?: string[];
    new(): AppScreen;
}