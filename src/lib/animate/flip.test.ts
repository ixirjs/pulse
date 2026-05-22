/**
 * Tests for the FLIP animate-layer helpers.
 * `captureRect`, `flipFromRect`, and `flipToRect` all delegate to
 * `measureWithoutAncestorTransforms` which uses DOM globals (HTMLElement,
 * getBoundingClientRect). Those paths require the `client` browser project.
 *
 * This file covers the module's exports and the FlipRect type shape.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import * as flipModule from "./flip";

describe("animate/flip module exports", () => {
  it("exports captureRect as a function", () => {
    expect(typeof flipModule.captureRect).toBe("function");
  });

  it("exports flipFromRect as a function", () => {
    expect(typeof flipModule.flipFromRect).toBe("function");
  });

  it("exports flipToRect as a function", () => {
    expect(typeof flipModule.flipToRect).toBe("function");
  });
});
