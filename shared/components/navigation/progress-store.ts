/**
 * Work in flight, for the top progress bar: route changes (NavProgress) and dashboard
 * saves (useProgressWhile) both report here, so one bar covers both.
 */
let active = 0;
const listeners = new Set<(busy: boolean) => void>();

export function startProgress() {
  active += 1;
  if (active === 1) listeners.forEach((listener) => listener(true));
}

export function doneProgress() {
  if (active === 0) return;
  active -= 1;
  if (active === 0) listeners.forEach((listener) => listener(false));
}

export function onProgress(listener: (busy: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
