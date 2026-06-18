/**
 * Tests for the shared-layout bridge.
 * Pure in-memory registry — runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from "vitest";
import { createLayoutBridge } from "./bridge";
import type { FlipRect } from "../types";

const rect = (x = 0, y = 0, w = 100, h = 50): FlipRect => ({
  x,
  y,
  width: w,
  height: h,
});

describe("createLayoutBridge()", () => {
  it("returns an object with bridge and clear", () => {
    const { bridge, clear } = createLayoutBridge();
    expect(typeof bridge.writeLayout).toBe("function");
    expect(typeof bridge.readLayout).toBe("function");
    expect(typeof clear).toBe("function");
  });

  it("readLayout returns null for an unknown id", () => {
    const { bridge } = createLayoutBridge();
    expect(bridge.readLayout("unknown")).toBeNull();
  });

  it("writeLayout + readLayout round-trips the rect", () => {
    const { bridge } = createLayoutBridge();
    const r = rect(10, 20, 300, 150);
    bridge.writeLayout("hero", r);
    expect(bridge.readLayout("hero")).toEqual(r);
  });

  it("readLayout deletes the entry on expiry", () => {
    vi.useFakeTimers();
    const { bridge } = createLayoutBridge(100);
    bridge.writeLayout("card", rect());
    // Advance past TTL
    vi.advanceTimersByTime(150);
    expect(bridge.readLayout("card")).toBeNull();
    vi.useRealTimers();
  });

  it("readLayout returns the rect while still within TTL", () => {
    vi.useFakeTimers();
    const { bridge } = createLayoutBridge(200);
    bridge.writeLayout("card", rect(1, 2, 3, 4));
    vi.advanceTimersByTime(100);
    expect(bridge.readLayout("card")).toEqual(rect(1, 2, 3, 4));
    vi.useRealTimers();
  });

  it("clear() removes all stored entries", () => {
    const { bridge, clear } = createLayoutBridge();
    bridge.writeLayout("a", rect());
    bridge.writeLayout("b", rect(5, 5));
    clear();
    expect(bridge.readLayout("a")).toBeNull();
    expect(bridge.readLayout("b")).toBeNull();
  });

  it("writeLayout overwrites a previously stored rect", () => {
    const { bridge } = createLayoutBridge();
    bridge.writeLayout("id", rect(0, 0, 100, 50));
    const newer = rect(99, 99, 200, 200);
    bridge.writeLayout("id", newer);
    expect(bridge.readLayout("id")).toEqual(newer);
  });

  it("separate bridges are independent", () => {
    const a = createLayoutBridge();
    const b = createLayoutBridge();
    a.bridge.writeLayout("shared", rect(1, 2, 3, 4));
    expect(b.bridge.readLayout("shared")).toBeNull();
  });

  it("custom ttlMs is respected", () => {
    vi.useFakeTimers();
    const { bridge } = createLayoutBridge(50);
    bridge.writeLayout("x", rect());
    vi.advanceTimersByTime(49);
    expect(bridge.readLayout("x")).not.toBeNull();
    vi.advanceTimersByTime(2);
    expect(bridge.readLayout("x")).toBeNull();
    vi.useRealTimers();
  });
});
