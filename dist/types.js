"use strict";
/**
 * Shared scan-tick primitive types.
 *
 * An `IntentMonitor<TEntity, TDetection>` describes one cron-driven evaluator
 * that pages through entities, inspects each for one or more detections, and
 * persists each detection idempotently. The orchestrator (`runScanTick`) wires
 * the pieces together; callers supply the concrete shape.
 *
 * Idempotency is the caller's responsibility — `emit` returns whether the
 * detection was genuinely new. This lets callers choose either:
 *   - Digest-on-insert: hash a stable tuple, rely on a `@@unique` constraint,
 *     swallow P2002 as a silent no-op (HH property-watch pattern).
 *   - Time-window lookup: query prior emits within a TTL, skip if recent
 *     (Rello life-event-scanner + observability-rate-alerts pattern).
 *
 * Third-party-feed callers (HH PE-feed) supply `recordFailure` so the
 * orchestrator can persist a DLQ row when `detect` returns empty AFTER a feed
 * call. Callers without third-party feeds leave it undefined.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map