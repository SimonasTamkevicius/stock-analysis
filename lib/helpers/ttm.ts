export function calculateTTM(values: number[]) {
  const ttm: number[] = [];

  for (let i = 3; i < values.length; i++) {
    const sum =
      values[i] +
      values[i - 1] +
      values[i - 2] +
      values[i - 3];

    ttm.push(sum);
  }

  return ttm;
}
