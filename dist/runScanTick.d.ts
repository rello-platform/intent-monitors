import type { IntentMonitor, RunScanOptions, ScanContext, ScanReport } from "./types";
/**
 * Generic scan-tick orchestrator. Pages through `monitor.loadPage`, calls
 * `monitor.detect` per entity, and `monitor.emit` per detection. Per-entity
 * exceptions are caught and counted in `report.uncaught`; the loop continues.
 * The orchestrator itself never throws.
 *
 * Iteration ends when `loadPage` returns `nextCursor: null` OR when
 * `report.scanned` reaches `options.globalBudget`.
 */
export declare function runScanTick<TEntity, TDetection>(monitor: IntentMonitor<TEntity, TDetection>, ctx: ScanContext, options?: RunScanOptions): Promise<ScanReport>;
//# sourceMappingURL=runScanTick.d.ts.map