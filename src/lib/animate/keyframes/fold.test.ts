import { describe, expect, it } from 'vitest';
import { applyFolds, planFolds } from './fold';
import type { KeyframeGroup } from './keyframes';

const group = (keyframes: Record<string, string[]>, duration = 400): KeyframeGroup => ({
	timing: { duration, easing: 'linear', delay: 0 },
	keyframes
});

const ownAll = () => true;
const noVars = () => '';

describe('planFolds()', () => {
	it('collapses a FLIP group into direct translate and scale keyframes', () => {
		const groups = [
			group({
				'--flip-x': ['120px', '0px'],
				'--flip-y': ['40px', '0px'],
				'--flip-scale-x': ['0.5', '1'],
				'--flip-scale-y': ['0.5', '1'],
				opacity: ['0', '1']
			})
		];

		const plans = planFolds(groups, noVars, ownAll);

		expect(plans.map((plan) => plan.target)).toEqual(['translate', 'scale']);
		const [translate, scale] = plans;
		// Vars with no animation fall back to their template defaults, so the
		// stop is a plain transform value with nothing left to resolve.
		expect(translate!.stops[0]).toBe('calc(0px + 120px + 0px) calc(0px + 40px + 0px) 0px');
		expect(translate!.stops[1]).toBe('calc(0px + 0px + 0px) calc(0px + 0px + 0px) 0px');
		expect(scale!.stops[0]).toBe('calc(0.5 * 1 * 1) calc(0.5 * 1 * 1)');
		expect(translate!.varKeys).toEqual(['--flip-x', '--flip-y']);
	});

	it('substitutes the live value of vars this call does not animate', () => {
		const groups = [group({ '--motion-x': ['0px', '50px'] })];

		const [plan] = planFolds(
			groups,
			(name) => (name === '--motion-reorder-x' ? '12px' : ''),
			ownAll
		);

		expect(plan!.stops[1]).toBe('calc(50px + 0px + 12px) calc(0px + 0px + 0px) 0px');
	});

	it('leaves a target alone when its channels have different timings', () => {
		const groups = [
			group({ '--motion-x': ['0px', '50px'] }, 400),
			group({ '--motion-y': ['0px', '50px'] }, 900)
		];

		expect(planFolds(groups, noVars, ownAll).map((plan) => plan.target)).toEqual([]);
	});

	it('leaves a target alone when the caller owns its transform', () => {
		const groups = [group({ '--motion-x': ['0px', '50px'], '--motion-rotate': ['0deg', '90deg'] })];

		const plans = planFolds(groups, noVars, (target) => target !== 'translate');

		expect(plans.map((plan) => plan.target)).toEqual(['rotate']);
	});

	it('ignores targets with no animated channel', () => {
		expect(planFolds([group({ opacity: ['0', '1'] })], noVars, ownAll)).toEqual([]);
	});
});

describe('applyFolds()', () => {
	it('swaps the variable keys for the folded property and reports the originals', () => {
		const groups = [group({ '--flip-x': ['10px', '0px'], opacity: ['0', '1'] })];
		const plans = planFolds(groups, noVars, ownAll);

		const originals = applyFolds(groups, plans);

		expect(Object.keys(groups[0]!.keyframes)).toEqual(['opacity', 'translate']);
		expect(originals.get(0)).toEqual({ '--flip-x': ['10px', '0px'], opacity: ['0', '1'] });
	});
});
