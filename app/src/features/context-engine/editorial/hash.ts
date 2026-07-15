const FNV1A_OFFSET_BASIS = 2166136261;
const FNV1A_PRIME = 16777619;
const SEED_SEPARATOR = "\u001f";

export function fnv1aUtf8(value: string): number {
  let hash = FNV1A_OFFSET_BASIS;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV1A_PRIME) >>> 0;
  }
  return hash;
}

export function selectEditorialVariantIndex(
  catalogVersion: string,
  actionId: string,
  variantCount: number,
): number {
  return fnv1aUtf8(`${catalogVersion}${SEED_SEPARATOR}${actionId}`) % variantCount;
}
