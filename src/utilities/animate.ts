export const EasingFunctions = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => --t * t * t + 1,
    easeInOutCubic: (t: number) =>
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInQuart: (t: number) => t * t * t * t,
    easeOutQuart: (t: number) => 1 - --t * t * t * t,
    easeInOutQuart: (t: number) =>
        t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
    easeInQuint: (t: number) => t * t * t * t * t,
    easeOutQuint: (t: number) => 1 + --t * t * t * t * t,
    easeInOutQuint: (t: number) =>
        t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
    easeInElastic: (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0
            ? 0
            : t === 1
            ? 1
            : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
    easeOutElastic: (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0
            ? 0
            : t === 1
            ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    easeInOutElastic: (t: number) => {
        const c5 = (2 * Math.PI) / 4.5;
        return t === 0            
        ? 0
        : t === 1
        ? 1
        : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    },
}

export function animate(
    draw: (t: number) => void,
    duration: number = 1000,
    timing: (t: number) => number = EasingFunctions.easeOutElastic,
) {
    const start = performance.now();

    return new Promise<boolean>(function(resolve){
        requestAnimationFrame(function animate(time) { 
            let timeFraction = (time -start) / duration;
            (timeFraction > 1) && (timeFraction = 1);
            draw(timing(timeFraction));
            timeFraction < 1 ? requestAnimationFrame(animate) : resolve(true);
        });
    })
}