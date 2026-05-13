import type {
  IntentMonitor,
  RunScanOptions,
  ScanContext,
  ScanReport,
} from "./types";

const DEFAULT_PAGE_SIZE = 100;

/**
 * Generic scan-tick orchestrator. Pages through `monitor.loadPage`, calls
 * `monitor.detect` per entity, and `monitor.emit` per detection. Per-entity
 * exceptions are caught and counted in `report.uncaught`; the loop continues.
 * The orchestrator itself never throws.
 *
 * Iteration ends when `loadPage` returns `nextCursor: null` OR when
 * `report.scanned` reaches `options.globalBudget`.
 */
export async function runScanTick<TEntity, TDetection>(
  monitor: IntentMonitor<TEntity, TDetection>,
  ctx: ScanContext,
  options: RunScanOptions = {},
): Promise<ScanReport> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const globalBudget = options.globalBudget ?? Number.POSITIVE_INFINITY;

  const report: ScanReport = {
    scanned: 0,
    detected: 0,
    emitted: 0,
    deduped: 0,
    uncaught: 0,
  };

  let cursor: string | null = null;
  let pages = 0;

  while (report.scanned < globalBudget) {
    let page: { entities: TEntity[]; nextCursor: string | null };
    try {
      page = await monitor.loadPage({ cursor, pageSize });
    } catch (err) {
      ctx.logger.error(`[${monitor.id}] loadPage threw`, {
        cursor,
        page: pages,
        error: err instanceof Error ? err.message : String(err),
      });
      break;
    }

    pages += 1;
    if (page.entities.length === 0) break;

    for (const entity of page.entities) {
      if (report.scanned >= globalBudget) break;
      report.scanned += 1;

      let detections: TDetection[];
      try {
        detections = await monitor.detect(entity, ctx);
      } catch (err) {
        report.uncaught += 1;
        ctx.logger.error(`[${monitor.id}] detect threw`, {
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      report.detected += detections.length;

      for (const detection of detections) {
        try {
          const result = await monitor.emit(detection, entity, ctx);
          if (result.emitted) {
            report.emitted += 1;
          } else {
            report.deduped += 1;
          }
        } catch (err) {
          report.uncaught += 1;
          ctx.logger.error(`[${monitor.id}] emit threw`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    if (page.nextCursor === null) break;
    cursor = page.nextCursor;
  }

  ctx.logger.info(`[${monitor.id}] tick complete`, {
    scanned: report.scanned,
    detected: report.detected,
    emitted: report.emitted,
    deduped: report.deduped,
    uncaught: report.uncaught,
    pages,
  });

  return report;
}
