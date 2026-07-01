/**
 * Pure constraint math for draggable elements — kept DOM-free so the clamping
 * and elastic-overflow behaviour can be unit-tested directly.
 */

/** Min/max bounds for a single axis (either side optional = unbounded). */
export interface AxisBounds {
	min?: number;
	max?: number;
}

/** Drag bounds in element-local offset coordinates. */
export interface DragConstraints {
	left?: number;
	right?: number;
	top?: number;
	bottom?: number;
}

/**
 * Clamp `value` into `[min, max]`. When `elastic` (0…1) is non-zero, motion
 * past a bound is dampened rather than hard-stopped: `0` = rigid wall,
 * `1` = no resistance, `0.2` = the typical rubber-band feel.
 */
export const applyConstraint = (value: number, { min, max }: AxisBounds, elastic = 0): number => {
	if (min != null && value < min) {
		return elastic > 0 ? min + (value - min) * elastic : min;
	}
	if (max != null && value > max) {
		return elastic > 0 ? max + (value - max) * elastic : max;
	}
	return value;
};

/** Project the `x` constraints from a {@link DragConstraints} box. */
export const xBounds = (c: DragConstraints): AxisBounds => ({
	min: c.left,
	max: c.right
});

/** Project the `y` constraints from a {@link DragConstraints} box. */
export const yBounds = (c: DragConstraints): AxisBounds => ({
	min: c.top,
	max: c.bottom
});
