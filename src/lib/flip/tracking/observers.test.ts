/**
 * Tests for createLayoutObservers().
 * In non-DOM environments (node), ResizeObserver and MutationObserver are
 * undefined — connect() is a safe no-op, and disconnect() is idempotent.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from "vitest";
import { createLayoutObservers } from "./observers";

const fakeEl = {
  parentElement: null,
} as unknown as Element;

describe("createLayoutObservers() — non-DOM environment", () => {
  it("returns an object with connect and disconnect", () => {
    const obs = createLayoutObservers({ element: fakeEl, onChange: () => {} });
    expect(typeof obs.connect).toBe("function");
    expect(typeof obs.disconnect).toBe("function");
  });

  it("connect() does not throw when observers are unavailable", () => {
    const obs = createLayoutObservers({ element: fakeEl, onChange: () => {} });
    expect(() => obs.connect()).not.toThrow();
  });

  it("disconnect() does not throw before connect()", () => {
    const obs = createLayoutObservers({ element: fakeEl, onChange: () => {} });
    expect(() => obs.disconnect()).not.toThrow();
  });

  it("disconnect() is idempotent", () => {
    const obs = createLayoutObservers({ element: fakeEl, onChange: () => {} });
    obs.connect();
    expect(() => {
      obs.disconnect();
      obs.disconnect();
    }).not.toThrow();
  });

  it("re-connect() after disconnect() does not throw", () => {
    const obs = createLayoutObservers({ element: fakeEl, onChange: () => {} });
    obs.connect();
    obs.disconnect();
    expect(() => obs.connect()).not.toThrow();
  });
});

describe("createLayoutObservers() — with mocked observers", () => {
  it("calls ResizeObserver.observe when available", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const constructorCalls: unknown[][] = [];
    class MockResizeObserver {
      observe = observe;
      disconnect = disconnect;
      constructor(...args: unknown[]) { constructorCalls.push(args); }
    }
    const origRO = (globalThis as Record<string, unknown>).ResizeObserver;
    (globalThis as Record<string, unknown>).ResizeObserver = MockResizeObserver;

    const onChange = vi.fn();
    const obs = createLayoutObservers({ element: fakeEl, onChange });
    obs.connect();

    expect(constructorCalls).toHaveLength(1);
    expect(observe).toHaveBeenCalledWith(fakeEl);

    (globalThis as Record<string, unknown>).ResizeObserver = origRO;
  });

  it("disconnect() calls ResizeObserver.disconnect", () => {
    const roDisconnect = vi.fn();
    class MockResizeObserver {
      observe = vi.fn();
      disconnect = roDisconnect;
      constructor(_cb: unknown) {}
    }
    const origRO = (globalThis as Record<string, unknown>).ResizeObserver;
    (globalThis as Record<string, unknown>).ResizeObserver = MockResizeObserver;

    const obs = createLayoutObservers({ element: fakeEl, onChange: vi.fn() });
    obs.connect();
    obs.disconnect();

    expect(roDisconnect).toHaveBeenCalledOnce();

    (globalThis as Record<string, unknown>).ResizeObserver = origRO;
  });

  it("calls MutationObserver.observe on the parent element when available", () => {
    const moObserve = vi.fn();
    const moDisconnect = vi.fn();
    class MockMutationObserver {
      observe = moObserve;
      disconnect = moDisconnect;
      constructor(_cb: unknown) {}
    }
    const origMO = (globalThis as Record<string, unknown>).MutationObserver;
    (globalThis as Record<string, unknown>).MutationObserver = MockMutationObserver;

    const parent = { parentElement: null } as unknown as Element;
    const elWithParent = { parentElement: parent } as unknown as Element;

    const obs = createLayoutObservers({ element: elWithParent, onChange: vi.fn() });
    obs.connect();

    expect(moObserve).toHaveBeenCalledWith(parent, {
      childList: true,
      subtree: false,
    });

    (globalThis as Record<string, unknown>).MutationObserver = origMO;
  });
});
