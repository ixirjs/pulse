/**
 * Inline-style save / restore, for the places that force a temporary value on
 * an element and must put the prior one back.
 *
 * Dependency-free on purpose: kept out of `prop-utils` so the static property
 * registry can import it without forming a cycle.
 */

/** A captured inline style property — its value plus `!important` priority. */
export interface SavedStyleProp {
	value: string;
	priority: string;
}

export const saveStyleProp = (style: CSSStyleDeclaration, name: string): SavedStyleProp => ({
	value: style.getPropertyValue(name),
	priority: style.getPropertyPriority(name)
});

/** Re-apply a captured value + priority, or remove the property if it was unset. */
export const restoreStyleProp = (
	style: CSSStyleDeclaration,
	name: string,
	saved: SavedStyleProp
): void => {
	if (saved.value) style.setProperty(name, saved.value, saved.priority);
	else style.removeProperty(name);
};
