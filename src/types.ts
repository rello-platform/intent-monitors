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

export interface IntentMonitor<TEntity, TDetection> {
  /** Stable id for log/telemetry tags. */
  readonly id: string;

  /**
   * Pull the next page of entities. `cursor: null` = first page. Returning
   * `nextCursor: null` ends the scan.
   *
   * Callers may yield either:
   *   - Genuine paged DB reads (HH property-watch: tenants × watches).
   *   - A flat in-memory list as one page (observability-rate-alerts:
   *     counters × tenants registry product).
   *   - A single page over a moderate-sized table (life-event-scanner:
   *     NurtureEnrollment with 100/batch cursor).
   */
  loadPage(args: {
    cursor: string | null;
    pageSize: number;
  }): Promise<{ entities: TEntity[]; nextCursor: string | null }>;

  /**
   * Inspect one entity, return zero or more detections. MUST NOT throw on
   * third-party-feed failures — return `[]` and call `recordFailure` (if
   * defined) instead. The orchestrator's per-entity try/catch is a safety
   * net, not the primary error boundary.
   */
  detect(entity: TEntity, ctx: ScanContext): Promise<TDetection[]>;

  /**
   * Persist one detection. Idempotent at the writer's discretion. Returns
   * `{ emitted: true }` when the detection is new (and any side-effects fired)
   * or `{ emitted: false }` when an idempotency check determined the detection
   * was already handled.
   */
  emit(
    detection: TDetection,
    entity: TEntity,
    ctx: ScanContext,
  ): Promise<{ emitted: boolean }>;

  /**
   * Optional: persist a per-entity third-party-feed failure (typically a DLQ
   * row + a per-entity failure-counter increment). Called by the orchestrator
   * when `detect` returns `[]` AFTER the caller's feed adapter reported a
   * non-recoverable failure. Callers without third-party feeds leave this
   * undefined.
   *
   * The orchestrator does NOT auto-invoke this on every empty `detect`
   * return — "no detections this tick" is the steady-state and is not a
   * failure. Callers signal failure-vs-empty by calling `recordFailure`
   * themselves from inside `detect`, or by surfacing the distinction via
   * `TDetection` and handling it in `emit`. The optional `recordFailure`
   * hook is here for callers that prefer to keep the failure-write outside
   * `detect`.
   */
  recordFailure?(
    entity: TEntity,
    reason: string,
    ctx: ScanContext,
  ): Promise<void>;
}

export interface ScanContext {
  /** Set by the orchestrator when the tick begins. Useful for tagging
   *  detections with a tick-correlation timestamp. */
  readonly tickStartedAt: Date;

  /** Pluggable logger; orchestrator + caller share this. Designed to accept
   *  a thin wrapper around Trigger.dev's `logger` or `console`. */
  readonly logger: {
    info(msg: string, fields?: Record<string, unknown>): void;
    warn(msg: string, fields?: Record<string, unknown>): void;
    error(msg: string, fields?: Record<string, unknown>): void;
  };
}

export interface RunScanOptions {
  /** Per-page size handed to `loadPage`. Default 100. */
  pageSize?: number;
  /** Hard cap on total entities scanned per tick. Default Infinity. Useful
   *  as a cron-tick safety net for unexpectedly large entity counts. */
  globalBudget?: number;
}

export interface ScanReport {
  scanned: number;
  detected: number;
  /** Detections where `emit` returned `{ emitted: true }`. */
  emitted: number;
  /** Detections where `emit` returned `{ emitted: false }` (idempotency hit). */
  deduped: number;
  /** Per-entity `detect()` calls that threw past their own error handling
   *  and were caught by the orchestrator's safety net. */
  uncaught: number;
}
