/**
 * SHA-256 helper for deterministic `detectionDigest` values. Joins parts with
 * `|`, mapping nullish parts to the empty string so `(null, "x")` and
 * `("", "x")` hash identically — matches HH property-watch `digest.ts` legacy
 * semantics. Numbers are stringified via JS coercion.
 *
 * Use the same `parts` ordering across all sites that compare against a given
 * `@@unique` constraint — the order is load-bearing for the hash.
 */
export declare function idempotencyKey(parts: ReadonlyArray<string | number | null | undefined>): string;
//# sourceMappingURL=idempotencyKey.d.ts.map