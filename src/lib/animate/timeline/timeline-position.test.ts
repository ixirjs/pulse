/**
 * Tests for the timeline position grammar (resolvePosition).
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import { resolvePosition, type Anchor } from "./timeline-position";

const anchor = (): Anchor => ({
  duration: 1000,
  lastStart: 600,
  lastEnd: 800,
  labels: new Map([["intro", 300]]),
});

describe("resolvePosition()", () => {
  it("appends at the current end for undefined", () => {
    expect(resolvePosition(undefined, anchor())).toBe(1000);
  });

  it("appends at the current end for the empty string", () => {
    expect(resolvePosition("", anchor())).toBe(1000);
    expect(resolvePosition("   ", anchor())).toBe(1000);
  });

  it("uses an absolute number directly", () => {
    expect(resolvePosition(250, anchor())).toBe(250);
  });

  it("clamps negative absolute numbers to 0", () => {
    expect(resolvePosition(-50, anchor())).toBe(0);
  });

  it("resolves +=N relative to the timeline end", () => {
    expect(resolvePosition("+=200", anchor())).toBe(1200);
  });

  it("resolves -=N relative to the timeline end", () => {
    expect(resolvePosition("-=200", anchor())).toBe(800);
  });

  it("clamps -=N below 0", () => {
    expect(resolvePosition("-=2000", anchor())).toBe(0);
  });

  it("resolves '>' to the end of the last entry", () => {
    expect(resolvePosition(">", anchor())).toBe(800);
  });

  it("resolves '>' with an offset", () => {
    expect(resolvePosition(">+100", anchor())).toBe(900);
    expect(resolvePosition(">-100", anchor())).toBe(700);
  });

  it("resolves '<' to the start of the last entry", () => {
    expect(resolvePosition("<", anchor())).toBe(600);
  });

  it("resolves '<' with an offset", () => {
    expect(resolvePosition("<+50", anchor())).toBe(650);
  });

  it("resolves a bare label to its declared time", () => {
    expect(resolvePosition("intro", anchor())).toBe(300);
  });

  it("resolves a label with an offset", () => {
    expect(resolvePosition("intro+=100", anchor())).toBe(400);
    expect(resolvePosition("intro-=100", anchor())).toBe(200);
  });

  it("throws for an unknown label", () => {
    expect(() => resolvePosition("missing", anchor())).toThrow(/Unknown label/);
  });
});
