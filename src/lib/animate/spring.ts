import type { SpringOptions } from "./types";
import { getCachedSpring, type SpringSamples } from "$lib/shared/spring-core";

export type Spring = SpringSamples;

/**
 * Simulate a spring travelling from 0 → 1 and return per-frame normalized
 * samples plus the settling duration. Results are memoized by option key.
 */
export const spring = (options: SpringOptions = {}): Spring =>
  getCachedSpring(options).spring;
