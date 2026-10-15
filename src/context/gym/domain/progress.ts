export const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Volume of a single set: reps x weight. */
export const setVolume = (weight: number | null, reps: number | null): number =>
  round2((weight ?? 0) * (reps ?? 0));

/**
 * Epley formula for the estimated one-rep max: `weight * (1 + reps / 30)`.
 * A single-rep set returns the weight itself.
 */
export const estimatedOneRm = (
  weight: number | null,
  reps: number | null,
): number => {
  const effectiveWeight = weight ?? 0;
  const effectiveReps = reps ?? 0;

  if (effectiveWeight <= 0 || effectiveReps <= 0) {
    return 0;
  }
  if (effectiveReps === 1) {
    return round2(effectiveWeight);
  }

  return round2(effectiveWeight * (1 + effectiveReps / 30));
};
