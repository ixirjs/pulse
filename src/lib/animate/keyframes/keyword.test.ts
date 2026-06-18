/**
 * Tests for intrinsic-size keyword detection.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import { isAutoKeyword } from "./keyword";

describe("isAutoKeyword()", () => {
  it("returns true for 'auto'", () => {
    expect(isAutoKeyword("auto")).toBe(true);
  });

  it("returns true for 'fit-content'", () => {
    expect(isAutoKeyword("fit-content")).toBe(true);
  });

  it("returns true for 'min-content'", () => {
    expect(isAutoKeyword("min-content")).toBe(true);
  });

  it("returns true for 'max-content'", () => {
    expect(isAutoKeyword("max-content")).toBe(true);
  });

  it("returns true for 'intrinsic'", () => {
    expect(isAutoKeyword("intrinsic")).toBe(true);
  });

  it("returns true for 'fit-content(50%)' functional form", () => {
    expect(isAutoKeyword("fit-content(50%)")).toBe(true);
  });

  it("is case-insensitive — 'AUTO' returns true", () => {
    expect(isAutoKeyword("AUTO")).toBe(true);
    expect(isAutoKeyword("Fit-Content")).toBe(true);
  });

  it("returns false for plain pixel values", () => {
    expect(isAutoKeyword("42px")).toBe(false);
    expect(isAutoKeyword("100%")).toBe(false);
    expect(isAutoKeyword("2em")).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isAutoKeyword(42)).toBe(false);
    expect(isAutoKeyword(0)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAutoKeyword(undefined)).toBe(false);
  });

  it("handles leading/trailing whitespace", () => {
    expect(isAutoKeyword("  auto  ")).toBe(true);
  });
});
