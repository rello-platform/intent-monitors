import { createHash } from "node:crypto";

/**
 * SHA-256 helper for deterministic `detectionDigest` values. Joins parts with
 * `|`, mapping nullish parts to the empty string so `(null, "x")` and
 * `("", "x")` hash identically — matches HH property-watch `digest.ts` legacy
 * semantics. Numbers are stringified via JS coercion.
 *
 * Use the same `parts` ordering across all sites that compare against a given
 * `@@unique` constraint — the order is load-bearing for the hash.
 */
export function idempotencyKey(
  parts: ReadonlyArray<string | number | null | undefined>,
): string {
  return createHash("sha256")
    .update(parts.map((p) => (p === null || p === undefined ? "" : String(p))).join("|"))
    .digest("hex");
}
