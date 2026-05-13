"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyKey = idempotencyKey;
const node_crypto_1 = require("node:crypto");
/**
 * SHA-256 helper for deterministic `detectionDigest` values. Joins parts with
 * `|`, mapping nullish parts to the empty string so `(null, "x")` and
 * `("", "x")` hash identically — matches HH property-watch `digest.ts` legacy
 * semantics. Numbers are stringified via JS coercion.
 *
 * Use the same `parts` ordering across all sites that compare against a given
 * `@@unique` constraint — the order is load-bearing for the hash.
 */
function idempotencyKey(parts) {
    return (0, node_crypto_1.createHash)("sha256")
        .update(parts.map((p) => (p === null || p === undefined ? "" : String(p))).join("|"))
        .digest("hex");
}
//# sourceMappingURL=idempotencyKey.js.map