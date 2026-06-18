/**
 * Tests for the inline-style save / restore helpers.
 * Uses a minimal in-memory CSSStyleDeclaration stub so it runs in the
 * `server` (node) vitest project without a real DOM.
 */

import { describe, expect, it } from "vitest";
import { restoreStyleProp, saveStyleProp } from "./style-utils";

/** Minimal CSSStyleDeclaration stand-in backed by a Map. */
const fakeStyle = () => {
  const map = new Map<string, { value: string; priority: string }>();
  return {
    getPropertyValue: (n: string) => map.get(n)?.value ?? "",
    getPropertyPriority: (n: string) => map.get(n)?.priority ?? "",
    setProperty: (n: string, v: string, p = "") => map.set(n, { value: v, priority: p }),
    removeProperty: (n: string) => void map.delete(n),
    has: (n: string) => map.has(n),
  } as unknown as CSSStyleDeclaration & { has: (n: string) => boolean };
};

describe("saveStyleProp()", () => {
  it("captures the current value and priority", () => {
    const style = fakeStyle();
    style.setProperty("--motion-x", "10px", "important");
    expect(saveStyleProp(style, "--motion-x")).toEqual({
      value: "10px",
      priority: "important",
    });
  });

  it("captures empty value/priority for an unset property", () => {
    const style = fakeStyle();
    expect(saveStyleProp(style, "--motion-x")).toEqual({ value: "", priority: "" });
  });
});

describe("restoreStyleProp()", () => {
  it("re-applies a saved value and its priority over a temporary write", () => {
    const style = fakeStyle();
    style.setProperty("--motion-x", "10px", "");
    const saved = saveStyleProp(style, "--motion-x");
    // Simulate a temporary suppression write.
    style.setProperty("--motion-x", "0px", "important");

    restoreStyleProp(style, "--motion-x", saved);
    expect(style.getPropertyValue("--motion-x")).toBe("10px");
    expect(style.getPropertyPriority("--motion-x")).toBe("");
  });

  it("removes the property when the saved value was empty (clears the temp write)", () => {
    const style = fakeStyle();
    const saved = saveStyleProp(style, "--motion-x"); // unset → empty
    style.setProperty("--motion-x", "0px", "important");

    restoreStyleProp(style, "--motion-x", saved);
    expect(style.has("--motion-x")).toBe(false);
  });
});
