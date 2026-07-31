/** Whether centers describe a normal ascending single-axis list. */
export const centersAreAscending = (centers: readonly number[]): boolean => {
	for (let i = 1; i < centers.length; i++) {
		if (centers[i]! < centers[i - 1]!) return false;
	}
	return true;
};

/** Find the nearest slot center, using binary search for ordinary linear lists. */
export const nearestCenterIndex = (
	centers: readonly number[],
	target: number,
	ascending = true
): number => {
	if (centers.length === 0) return -1;
	if (!ascending) return nearestUnsortedCenterIndex(centers, target);

	let low = 0;
	let high = centers.length;
	while (low < high) {
		const middle = (low + high) >>> 1;
		if (centers[middle]! < target) low = middle + 1;
		else high = middle;
	}
	if (low === 0) return 0;
	if (low === centers.length) return centers.length - 1;
	return target - centers[low - 1]! <= centers[low]! - target ? low - 1 : low;
};

/** Preserve nearest-slot semantics for non-linear visual arrangements. */
const nearestUnsortedCenterIndex = (centers: readonly number[], target: number): number => {
	let nearest = 0;
	for (let i = 1; i < centers.length; i++) {
		if (Math.abs(centers[i]! - target) < Math.abs(centers[nearest]! - target)) nearest = i;
	}
	return nearest;
};
