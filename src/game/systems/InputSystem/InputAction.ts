export const InputAction = {
    Jump: 'jump',
    Flip: 'flip',
} as const;

export type InputAction = (typeof InputAction)[keyof typeof InputAction];