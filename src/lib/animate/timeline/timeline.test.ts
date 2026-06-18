/**
 * Tests for timeline() — position resolution, duration tracking, labels,
 * and sequential / parallel entry scheduling.
 *
 * `timeline()` needs DOM elements only when `animate()` is materialized. By
 * keeping the timeline in `paused: true` mode and passing a dummy element
 * (the element is only accessed when `duration` is a DurationFn; we use plain
 * numbers), all position math runs as pure logic — safe in the `server` project.
 */

import { describe, expect, it } from "vitest";
import { timeline } from "./timeline";

/** Dummy element — only accessed when duration is a DurationFn. */
const EL = {} as HTMLElement;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("timeline() — initial state", () => {
  it("duration starts at 0", () => {
    const tl = timeline({ paused: true });
    expect(tl.duration).toBe(0);
  });

  it("labels map is initially empty", () => {
    const tl = timeline({ paused: true });
    expect(tl.labels.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Sequential .add() entries (default append-at-end)
// ---------------------------------------------------------------------------

describe("timeline.add() — sequential appending", () => {
  it("single add() produces duration equal to prop duration", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    expect(tl.duration).toBe(300);
  });

  it("two sequential adds accumulate duration", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 400 });
    expect(tl.duration).toBe(600);
  });

  it("three sequential adds sum correctly", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 100 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    expect(tl.duration).toBe(600);
  });

  it("delay extends the entry's end time", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: { to: 1, duration: 200, delay: 50 } });
    expect(tl.duration).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// Absolute position
// ---------------------------------------------------------------------------

describe("timeline.add() — absolute position", () => {
  it("position: 0 starts entry at time 0", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 }, 0);
    expect(tl.duration).toBe(300);
  });

  it("two entries at position 0 run in parallel — duration = max", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 }, 0);
    tl.add(EL, { opacity: [0, 1] }, { duration: 500 }, 0);
    expect(tl.duration).toBe(500);
  });

  it("absolute position in the middle creates a gap", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 100 }, 400);
    expect(tl.duration).toBe(500);
  });

  it("negative absolute position is clamped to 0", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 }, -100);
    expect(tl.duration).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Relative position: "+=N" / "-=N"
// ---------------------------------------------------------------------------

describe("timeline.add() — relative position '+=N'", () => {
  it("'+=100' appends 100ms after current end", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 100 }, "+=50");
    // cursor: 200 + 50 = 250 start; 250 + 100 = 350 end
    expect(tl.duration).toBe(350);
  });

  it("'-=100' overlaps by 100ms", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 }, "-=100");
    // cursor: 300 - 100 = 200 start; 200 + 200 = 400 end
    expect(tl.duration).toBe(400);
  });

  it("'-=N' clamped at 0 when offset exceeds current duration", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 100 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 }, "-=999");
    // start = max(0, 100 - 999) = 0; end = 200
    expect(tl.duration).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Anchor positions: "<" (last start) and ">" (last end)
// ---------------------------------------------------------------------------

describe("timeline.add() — '>' anchor (last entry end)", () => {
  it("'>' is the same as the default — appends at last end", () => {
    const tl1 = timeline({ paused: true });
    tl1.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl1.add(EL, { opacity: [0, 1] }, { duration: 100 });

    const tl2 = timeline({ paused: true });
    tl2.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl2.add(EL, { opacity: [0, 1] }, { duration: 100 }, ">");

    expect(tl1.duration).toBe(tl2.duration);
  });

  it("'>+50' starts 50ms after the last entry ended", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 100 }, ">+50");
    // last end = 200; start = 250; end = 350
    expect(tl.duration).toBe(350);
  });

  it("'>-50' starts 50ms before the last entry ended (overlap)", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 100 }, ">-50");
    // last end = 200; start = 150; end = 250
    expect(tl.duration).toBe(250);
  });
});

describe("timeline.add() — '<' anchor (last entry start)", () => {
  it("'<' starts at same time as last entry", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 }, "<");
    // second starts at same start as first (t=0), runs 200ms
    expect(tl.duration).toBe(300);
  });

  it("'<+100' starts 100ms after the last entry started", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 400 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 }, "<+100");
    // first start = 0; second start = 100; second end = 300
    expect(tl.duration).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

describe("timeline.label()", () => {
  it("stores a label at the current cursor", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl.label("mid");
    expect(tl.labels.get("mid")).toBe(200);
  });

  it("label at time 0 before any entries", () => {
    const tl = timeline({ paused: true });
    tl.label("start");
    expect(tl.labels.get("start")).toBe(0);
  });

  it("add() at a label starts at the label's time", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    tl.label("reveal");
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 }, "reveal");
    // second entry starts at label time 300 (same as end of first), ends at 500
    expect(tl.duration).toBe(500);
  });

  it("add() at 'label+=100' starts 100ms after label", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    tl.label("A");
    tl.add(EL, { opacity: [0, 1] }, { duration: 100 }, "A+=50");
    // A = 200; start = 250; end = 350
    expect(tl.duration).toBe(350);
  });

  it("add() at 'label-=100' starts 100ms before label", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    tl.label("B");
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 }, "B-=100");
    // B = 300; start = 200; end = 400
    expect(tl.duration).toBe(400);
  });

  it("multiple labels are all stored in the labels map", () => {
    const tl = timeline({ paused: true });
    tl.label("a");
    tl.label("b");
    tl.label("c");
    expect(tl.labels.size).toBe(3);
    expect(tl.labels.has("a")).toBe(true);
    expect(tl.labels.has("b")).toBe(true);
    expect(tl.labels.has("c")).toBe(true);
  });

  it("throws on unknown label", () => {
    const tl = timeline({ paused: true });
    expect(() => tl.add(EL, { opacity: [0, 1] }, { duration: 100 }, "unknown")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// .call() entries
// ---------------------------------------------------------------------------

describe("timeline.call()", () => {
  it("does not affect the duration when appended at current end", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    tl.call(() => {});
    expect(tl.duration).toBe(300);
  });

  it("placed at absolute position 0 does not affect duration if entries are longer", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    tl.call(() => {}, 0);
    expect(tl.duration).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// .set() entries
// ---------------------------------------------------------------------------

describe("timeline.set()", () => {
  it("set() at current end does not grow the duration", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: [0, 1] }, { duration: 300 });
    tl.set(EL, { opacity: 0 });
    // set() is instant — duration stays 300
    expect(tl.duration).toBe(300);
  });

  it("set() before any add() produces duration 0", () => {
    const tl = timeline({ paused: true });
    tl.set(EL, { opacity: 0 });
    expect(tl.duration).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Spring-driven entries (pure — spring simulation is server-safe)
// ---------------------------------------------------------------------------

describe("timeline.add() — spring duration", () => {
  it("spring: true gives positive duration with no explicit duration", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: { to: 1, spring: true } });
    expect(tl.duration).toBeGreaterThan(0);
  });

  it("explicit duration overrides spring simulation duration", () => {
    const tl = timeline({ paused: true });
    tl.add(EL, { opacity: { to: 1, spring: true, duration: 500 } });
    expect(tl.duration).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Timeline defaults propagation
// ---------------------------------------------------------------------------

describe("timeline() — defaults propagation", () => {
  it("duration from timeline defaults is used when no per-add duration", () => {
    const tl = timeline({ paused: true, duration: 400 });
    tl.add(EL, { opacity: [0, 1] });
    expect(tl.duration).toBe(400);
  });

  it("per-add options override timeline defaults", () => {
    const tl = timeline({ paused: true, duration: 400 });
    tl.add(EL, { opacity: [0, 1] }, { duration: 200 });
    expect(tl.duration).toBe(200);
  });
});
