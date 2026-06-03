export function statusModifier(status: string) {
  return status.trim().replace(/[^a-zA-Z0-9_-]+/g, '-')
}
