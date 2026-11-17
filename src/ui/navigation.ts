import { useHashLocation } from 'wouter/use-hash-location';

/** Navigation is immediate; Page owns the skeleton loading presentation. */
export function useTransitionHashLocation(opts?: { ssrPath?: string }) {
  return useHashLocation(opts);
}
