# @rello-platform/intent-monitors

Shared scan-tick primitive for cron-driven intent monitors across the Rello platform. Provides an `IntentMonitor<TEntity, TDetection>` interface, a generic `runScanTick` orchestrator, an `idempotencyKey` SHA-256 helper, and a `dlqRecord` `FailedSignal` writer. Caller-specific detect/emit logic stays in the caller; the package extracts the orchestration + idempotency-helper + DLQ-writer shape.

## Install

```bash
npm install "github:rello-platform/intent-monitors#v0.1.0"
```

## Callers (as of v0.1.0)

- **Harvest Home** — `src/trigger/property-watch-scan.ts` (PropertyWatch × PE parcel-graph → listing / equity / address-change events)
- **Rello** — `src/trigger/jobs/life-event-scanner.ts` (NurtureEnrollment → rate-drop / anniversary / equity-change re-engagement)
- **Rello** — `src/trigger/jobs/observability-rate-alerts.ts` (Milo observability counters × tenants → partition-breach AdminNotifications)

## Usage

```ts
import {
  runScanTick,
  idempotencyKey,
  dlqRecord,
  type IntentMonitor,
  type ScanContext,
} from "@rello-platform/intent-monitors";

interface WatchEntity { id: string; tenantId: string; /* ... */ }
interface ListingDetection { watchId: string; parcelId: string; listingStatus: string; /* ... */ }

const propertyWatchMonitor: IntentMonitor<WatchEntity, ListingDetection> = {
  id: "harvest-home-property-watch-scan",
  async loadPage({ cursor, pageSize }) { /* paged tenants × ACTIVE watches */ },
  async detect(watch, ctx) {
    const parcel = await getParcelByParcelId(watch.parcelId).catch(() => null);
    if (!parcel) {
      await dlqRecord(prisma, {
        tenantId: watch.tenantId,
        signalType: "harvest-home.property_watch_scan_failed",
        payload: { watchId: watch.id, reason: "parcel-fetch-failed" },
        logger: ctx.logger,
        logTag: "property-watch-scan",
      });
      return [];
    }
    return parcel.marketStatus
      ? [{ watchId: watch.id, parcelId: watch.parcelId, listingStatus: parcel.marketStatus }]
      : [];
  },
  async emit(detection, watch, ctx) {
    const digest = idempotencyKey([detection.parcelId, null, detection.listingStatus]);
    try {
      await prisma.listingDetectedEvent.create({ data: { ...detection, detectionDigest: digest } });
      return { emitted: true };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return { emitted: false };
      throw err;
    }
  },
};

export const propertyWatchScan = schedules.task({
  id: "harvest-home-property-watch-scan",
  cron: "0 8 * * *",
  run: async () => {
    return runScanTick(propertyWatchMonitor, {
      tickStartedAt: new Date(),
      logger,
    }, { pageSize: 200, globalBudget: 100_000 });
  },
});
```

## Design notes

- **Idempotency is the caller's job.** `emit` returns `{ emitted: boolean }` so the orchestrator can count new-vs-deduped without prescribing HOW. HH uses digest-on-insert P2002; life-event-scanner uses time-window lookup; observability-rate-alerts uses advisory-lock + cooldown query.
- **No `@prisma/client` dependency.** `DlqWriter` is structural-typed; pass any Prisma client (or test fake) exposing `failedSignal.create`.
- **Never throws.** `runScanTick`'s per-entity try/catch is a safety net; `loadPage` errors break the loop with a log. The orchestrator returns a `ScanReport` rather than surfacing exceptions, so cron loops stay running across one bad entity.
- **`recordFailure` is optional.** Only HH property-watch has a third-party feed today. The other two callers leave it undefined.

## Versioning

`v0.x.y` — pre-1.0, breaking changes possible. The package is `private: true`; install via `github:rello-platform/intent-monitors#vX.Y.Z` (public repo, no GitHub Packages registry).

`dist/` is committed per Rello platform convention (Railway nixpacks unauthenticated clone has no build step).
