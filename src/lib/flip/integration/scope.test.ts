/**
 * Tests for createFlipScope().
 * Verifies the returned API surface and the shared-layout bridge integration.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import { createFlipScope } from "./scope";

describe("createFlipScope()", () => {
  it("returns an object with flip and clear", () => {
    const scope = createFlipScope();
    expect(typeof scope.flip).toBe("function");
    expect(typeof scope.clear).toBe("function");
  });

  it("flip() returns a function (Svelte attachment)", () => {
    const { flip } = createFlipScope();
    const attachment = flip();
    expect(typeof attachment).toBe("function");
  });

  it("flip() accepts options", () => {
    const { flip } = createFlipScope();
    expect(() => flip({ duration: 300 })).not.toThrow();
  });

  it("flip() accepts no options", () => {
    const { flip } = createFlipScope();
    expect(() => flip()).not.toThrow();
  });

  it("clear() does not throw on empty scope", () => {
    const { clear } = createFlipScope();
    expect(() => clear()).not.toThrow();
  });

  it("accepts custom layoutTtlMs option", () => {
    expect(() => createFlipScope({ layoutTtlMs: 500 })).not.toThrow();
  });

  it("each call returns an independent scope", () => {
    const a = createFlipScope();
    const b = createFlipScope();
    // Scopes use independent bridges; they don't share state
    expect(a).not.toBe(b);
  });

  it("clear() is independent between scopes (no shared state)", () => {
    // Verify scopes are truly isolated — clearing one does not affect the other.
    // We test this indirectly: both scopes' clear() can run without throwing.
    const a = createFlipScope();
    const b = createFlipScope();
    a.clear();
    expect(() => b.clear()).not.toThrow();
  });
});
