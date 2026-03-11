import {
    Assets,
    extensions,
    ExtensionType,
    resolveTextureUrl,
    type ResolveURLParser,
    Resolver,
    type UnresolvedAsset
} from 'pixi.js';

import manifest from '../manifest.json';

export const resolveJsonUrl = {
    extension: ExtensionType.ResolveParser,
    test: (value: string): boolean => Resolver.RETINA_PREFIX.test(value) && value.endsWith('.json'),
    parse: resolveTextureUrl.parse
} as ResolveURLParser;

extensions.add(resolveJsonUrl);

export async function initAssets() {
    await Assets.init({ manifest });
    await Assets.loadBundle(['preload', 'default', 'pause-overlay']);

    const allBundles = manifest.bundles.map((item) => item.name);
    Assets.backgroundLoadBundle(allBundles);
}

export function isBundleLoaded(bundleName: string): boolean {
    const bundleManifest = manifest.bundles.find(bundle => bundle.name === bundleName);

    if(!bundleManifest) {
        return false;
    }

    for(const asset of bundleManifest.assets as UnresolvedAsset[]) {
        if(!Assets.cache.has(asset.alias)) {
            return false;
        }
    }

    return true;
}

export function areBundlesLoaded(bundles: string[]): boolean {
    for (const name of bundles) {
        if (!isBundleLoaded(name)) {
            return false;
        }
    }
    return true;
}