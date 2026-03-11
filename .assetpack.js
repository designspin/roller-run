import { pixiPipes } from "@assetpack/core/pixi";

export default {
    entry: './raw-assets',
    output: './public/',
    cache: true,
    pipes: [
        ...pixiPipes({
            cacheBust: false,
            texturePacker: {
                texturePacker: {
                    removeFileExtensions: true,
                },
            },
            manifest: {
                output: './src/manifest.json'
            }
        })
    ]
}