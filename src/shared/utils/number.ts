export const toNumber = (
  value: string,
  fallback: number,
  min = 0,
  max = Number.POSITIVE_INFINITY,
) => {
  const parsedValue = Number.parseFloat(value)

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsedValue))
}
