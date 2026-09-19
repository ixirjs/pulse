/**
 * Maps high-level animation prop names (`x`, `scale`, `opacity`, …) to the
 * underlying CSS property they drive plus a default unit/initial value.
 *
 * Transform-related props animate registered CSS custom properties so each
 * axis can have its own duration / easing / spring without conflicting with
 * sibling animations on the same element.
 */

export interface PropDef {
	/** CSS property name to animate (may be a custom property). */
	css: string;
	/** Default unit appended when a numeric value is supplied. */
	unit: string;
	/** Initial / "rest" value. */
	initial: string;
	/** CSS @property syntax descriptor. Enables smooth interpolation for vars. */
	syntax?: string;
	/** Whether this prop is a transform component driving the composed style. */
	transform?: boolean;
	/**
	 * Whether the prop accepts intrinsic-size keywords (`auto`, `fit-content`,
	 * `min-content`, `max-content`). When true, `animate()` will measure the
	 * keyword's resolved pixel value and restore the keyword inline once the
	 * animation finishes so the element stays responsive.
	 */
	measurable?: boolean;
	/**
	 * For dimension-like properties whose CSS computed value may still be a
	 * keyword (e.g. `max-width: none`, `min-height: auto`), this indicates
	 * which axis of `getBoundingClientRect()` to fall back to when
	 * `getComputedStyle` echoes the keyword rather than resolving it to px.
	 */
	sizeDimension?: 'width' | 'height';
}

export const PROPERTY_REGISTRY: Readonly<Record<string, PropDef>> = {
	// Transform components — animated through CSS variables.
	x: {
		css: '--motion-x',
		unit: 'px',
		initial: '0px',
		syntax: '<length-percentage>',
		transform: true
	},
	y: {
		css: '--motion-y',
		unit: 'px',
		initial: '0px',
		syntax: '<length-percentage>',
		transform: true
	},
	z: { css: '--motion-z', unit: 'px', initial: '0px', syntax: '<length>', transform: true },
	scale: { css: '--motion-scale', unit: '', initial: '1', syntax: '<number>', transform: true },
	scaleX: { css: '--motion-scale-x', unit: '', initial: '1', syntax: '<number>', transform: true },
	scaleY: { css: '--motion-scale-y', unit: '', initial: '1', syntax: '<number>', transform: true },
	rotate: {
		css: '--motion-rotate',
		unit: 'deg',
		initial: '0deg',
		syntax: '<angle>',
		transform: true
	},
	// FLIP-exclusive offset vars — compose with x/y so FLIP transitions never
	// clobber sibling position animations that share --motion-x / --motion-y.
	flipX: { css: '--flip-x', unit: 'px', initial: '0px', syntax: '<length>', transform: true },
	flipY: { css: '--flip-y', unit: 'px', initial: '0px', syntax: '<length>', transform: true },
	// Reorder-exclusive offsets — direct-manipulation drag and sibling shifts
	// compose with animation and FLIP instead of replacing `transform`.
	reorderX: {
		css: '--motion-reorder-x',
		unit: 'px',
		initial: '0px',
		syntax: '<length>',
		transform: true
	},
	reorderY: {
		css: '--motion-reorder-y',
		unit: 'px',
		initial: '0px',
		syntax: '<length>',
		transform: true
	},
	// FLIP-exclusive scale vars — compose with scaleX/scaleY so FLIP scale
	// never clobbers sibling scale animations that share --motion-scale-x/y.
	flipScaleX: {
		css: '--flip-scale-x',
		unit: '',
		initial: '1',
		syntax: '<number>',
		transform: true
	},
	flipScaleY: {
		css: '--flip-scale-y',
		unit: '',
		initial: '1',
		syntax: '<number>',
		transform: true
	},

	// Common CSS shorthands with sensible default units.
	opacity: { css: 'opacity', unit: '', initial: '1' },
	width: { css: 'width', unit: 'px', initial: 'auto', measurable: true },
	height: { css: 'height', unit: 'px', initial: 'auto', measurable: true },
	top: { css: 'top', unit: 'px', initial: 'auto', measurable: true },
	left: { css: 'left', unit: 'px', initial: 'auto', measurable: true },
	right: { css: 'right', unit: 'px', initial: 'auto', measurable: true },
	bottom: { css: 'bottom', unit: 'px', initial: 'auto', measurable: true },
	margin: { css: 'margin', unit: 'px', initial: '0' },
	marginTop: { css: 'margin-top', unit: 'px', initial: '0', measurable: true },
	marginRight: { css: 'margin-right', unit: 'px', initial: '0', measurable: true },
	marginBottom: { css: 'margin-bottom', unit: 'px', initial: '0', measurable: true },
	marginLeft: { css: 'margin-left', unit: 'px', initial: '0', measurable: true },
	padding: { css: 'padding', unit: 'px', initial: '0' },
	paddingTop: { css: 'padding-top', unit: 'px', initial: '0' },
	paddingRight: { css: 'padding-right', unit: 'px', initial: '0' },
	paddingBottom: { css: 'padding-bottom', unit: 'px', initial: '0' },
	paddingLeft: { css: 'padding-left', unit: 'px', initial: '0' },
	// Sizing constraints — sizeDimension lets measurement fall back to the
	// bounding rect when getComputedStyle echoes the keyword (e.g. "none").
	maxWidth: {
		css: 'max-width',
		unit: 'px',
		initial: 'none',
		measurable: true,
		sizeDimension: 'width'
	},
	maxHeight: {
		css: 'max-height',
		unit: 'px',
		initial: 'none',
		measurable: true,
		sizeDimension: 'height'
	},
	minWidth: {
		css: 'min-width',
		unit: 'px',
		initial: '0',
		measurable: true,
		sizeDimension: 'width'
	},
	minHeight: {
		css: 'min-height',
		unit: 'px',
		initial: '0',
		measurable: true,
		sizeDimension: 'height'
	},
	// Typography
	fontSize: { css: 'font-size', unit: 'px', initial: '16px' },
	lineHeight: { css: 'line-height', unit: '', initial: 'normal' },
	letterSpacing: { css: 'letter-spacing', unit: 'px', initial: '0px' },
	wordSpacing: { css: 'word-spacing', unit: 'px', initial: '0px' },
	// Borders & outline
	borderRadius: { css: 'border-radius', unit: 'px', initial: '0' },
	borderWidth: { css: 'border-width', unit: 'px', initial: '0' },
	outlineWidth: { css: 'outline-width', unit: 'px', initial: '0' },
	outlineOffset: { css: 'outline-offset', unit: 'px', initial: '0' },
	// Layout
	gap: { css: 'gap', unit: 'px', initial: '0' },
	columnGap: { css: 'column-gap', unit: 'px', initial: '0' },
	rowGap: { css: 'row-gap', unit: 'px', initial: '0' },
	// Flex
	flexGrow: { css: 'flex-grow', unit: '', initial: '0' },
	flexShrink: { css: 'flex-shrink', unit: '', initial: '1' },
	// Stacking & visibility
	zIndex: { css: 'z-index', unit: '', initial: 'auto' },
	// Colors
	color: { css: 'color', unit: '', initial: 'currentColor' },
	backgroundColor: { css: 'background-color', unit: '', initial: 'transparent' },
	borderColor: { css: 'border-color', unit: '', initial: 'transparent' },
	outlineColor: { css: 'outline-color', unit: '', initial: 'currentColor' },
	// Filters (pass full CSS string, e.g. 'blur(4px)')
	filter: { css: 'filter', unit: '', initial: 'none' },
	backdropFilter: { css: 'backdrop-filter', unit: '', initial: 'none' },
	// SVG
	strokeDashoffset: { css: 'stroke-dashoffset', unit: '', initial: '0' },
	strokeDasharray: { css: 'stroke-dasharray', unit: '', initial: 'none' },
	strokeWidth: { css: 'stroke-width', unit: 'px', initial: '1' },
	strokeOpacity: { css: 'stroke-opacity', unit: '', initial: '1' },
	fillOpacity: { css: 'fill-opacity', unit: '', initial: '1' },
	// SVG paint — animate via WAAPI's native <color> interpolation.
	fill: { css: 'fill', unit: '', initial: 'currentColor' },
	stroke: { css: 'stroke', unit: '', initial: 'currentColor' },
	// CSS Motion Path — `offsetDistance` is natively animatable (the UA registers
	// it as <length-percentage>), so it interpolates without @property setup.
	// Use the `motionPath()` helper to wire `offset-path` and drive distance.
	offsetDistance: { css: 'offset-distance', unit: '%', initial: '0%' },
	offsetRotate: { css: 'offset-rotate', unit: 'deg', initial: 'auto' }
};

/**
 * Composed CSS expressions for the individual `translate`, `scale`, `rotate`
 * properties so that each transform component reads its own custom var.
 */
export const TRANSFORM_TEMPLATES = {
	translate:
		'calc(var(--motion-x, 0px) + var(--flip-x, 0px) + var(--motion-reorder-x, 0px)) ' +
		'calc(var(--motion-y, 0px) + var(--flip-y, 0px) + var(--motion-reorder-y, 0px)) ' +
		'var(--motion-z, 0px)',
	scale:
		'calc(var(--flip-scale-x, 1) * var(--motion-scale-x, 1) * var(--motion-scale, 1)) ' +
		'calc(var(--flip-scale-y, 1) * var(--motion-scale-y, 1) * var(--motion-scale, 1))',
	rotate: 'var(--motion-rotate, 0deg)'
} as const;

export {
	VAR_BIT,
	registerTransformAnimation,
	deregisterTransformAnimation,
	registerFoldedTransforms,
	demoteFoldedTransforms,
	hasActiveTransforms,
	measureWithoutAncestorTransforms,
	type FoldedTransform
} from './transform-tracker';
