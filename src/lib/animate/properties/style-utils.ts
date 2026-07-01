/**
 * Inline-style save / restore helpers.
 *
 * Several places force a temporary inline value on an element — measuring an
 * intrinsic-size keyword, or suppressing motion vars during a rect read — and
 * must put the prior value (and its `!important` priority) back afterwards.
 * This is the single source of truth for that capture / restore dance.
 *
 * Dependency-free on purpose: kept separate from `prop-utils` so the static
 * property registry (`properties` → `transform-tracker`) can import it without
 * forming an import cycle.
 */

/** A captured inline style property — its value plus `!important` priority. */
export interface SavedStyleProp {
	value: string;
	priority: string;
}

/**
 * Capture an inline style property so it can be restored after a temporary
 * write (e.g. forcing a keyword to measure it, or suppressing a motion var).
 */
export const saveStyleProp = (style: CSSStyleDeclaration, name: string): SavedStyleProp => ({
	value: style.getPropertyValue(name),
	priority: style.getPropertyPriority(name)
});

/**
 * Restore a property captured by {@link saveStyleProp}. Re-applies the saved
 * value and priority, or removes the property entirely when it was unset —
 * which also clears any temporary `!important` write.
 */
export const restoreStyleProp = (
	style: CSSStyleDeclaration,
	name: string,
	saved: SavedStyleProp
): void => {
	if (saved.value) style.setProperty(name, saved.value, saved.priority);
	else style.removeProperty(name);
};
