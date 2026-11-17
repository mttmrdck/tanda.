/** English UI strings. `{name}` placeholders are filled by `t(key, vars)`. */
export const en = {
  appName: 'Isyarat',
  tagline: 'Teach the camera what your child already says.',
  privacyChip: 'On this device only',
  errorTitle: 'Something went wrong',
  errorBody: 'This part of Isyarat stopped working. Your saved signals are safe on this device.',
  errorRetry: 'Try again',
  errorReload: 'Reload Isyarat',
} as const;

export type MsgKey = keyof typeof en;
