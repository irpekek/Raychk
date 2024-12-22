export const isError = (obj: unknown): obj is Error  => {
  return obj !== null && typeof obj === 'object' && obj instanceof Error
}