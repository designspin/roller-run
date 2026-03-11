import { Filter, GlProgram } from 'pixi.js';

import vertex from './checkerboard.vert?raw';
import fragment from './fantasyzone.frag?raw';

export class FantasyZoneFilter extends Filter {
    constructor() {
        const glProgram = GlProgram.from({
            vertex,
            fragment,
        });

        super({
            glProgram,
            resources: {
                fantasyUniforms: {
                    uTime: { value: 0, type: 'f32' },
                    uScroll: { value: 0, type: 'f32' },
                    uResolution: { value: new Float32Array([720, 1280]), type: 'vec2<f32>' },
                },
            },
        });
    }

    get time(): number {
        return this.resources.fantasyUniforms.uniforms.uTime;
    }

    set time(value: number) {
        this.resources.fantasyUniforms.uniforms.uTime = value;
    }

    get scroll(): number {
        return this.resources.fantasyUniforms.uniforms.uScroll;
    }

    set scroll(value: number) {
        this.resources.fantasyUniforms.uniforms.uScroll = value;
    }

    setResolution(width: number, height: number) {
        this.resources.fantasyUniforms.uniforms.uResolution[0] = width;
        this.resources.fantasyUniforms.uniforms.uResolution[1] = height;
    }
}
