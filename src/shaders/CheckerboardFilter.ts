import { Filter, GlProgram } from 'pixi.js';

import vertex from './checkerboard.vert?raw';
import fragment from './checkerboard.frag?raw';

export class CheckerboardFilter extends Filter {
    constructor() {
        const glProgram = GlProgram.from({
            vertex,
            fragment,
        });

        super({
            glProgram,
            resources: {
                checkerUniforms: {
                    uTime: { value: 0, type: 'f32' },
                    uScale: { value: 120, type: 'f32' },
                    uSpeed: { value: 0.5, type: 'f32' },
                    uScroll: { value: 0, type: 'f32' },
                },
            },
        });
    }

    get time(): number {
        return this.resources.checkerUniforms.uniforms.uTime;
    }

    set time(value: number) {
        this.resources.checkerUniforms.uniforms.uTime = value;
    }

    set scroll(value: number) {
        this.resources.checkerUniforms.uniforms.uScroll = value;
    }
}
