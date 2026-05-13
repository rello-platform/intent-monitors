import type { ScanContext } from "./types";
/**
 * Structural-typed Prisma writer that accepts any client exposing
 * `failedSignal.create`. Callers pass their own Prisma client — the package
 * does NOT depend on `@prisma/client` directly (which would force a version
 * pin across all consumers).
 */
export interface DlqWriter {
    failedSignal: {
        create: (args: {
            data: {
                tenantId: string;
                signalType: string;
                priority: string;
                payload: Record<string, unknown>;
            };
        }) => Promise<unknown>;
    };
}
export interface DlqRecordArgs {
    tenantId: string;
    /** Signal type slug (e.g. `harvest-home.property_watch_scan_failed`). */
    signalType: string;
    /** Defaults to `"low"`. Pass `"normal"` or `"high"` for urgent DLQ rows. */
    priority?: "low" | "normal" | "high";
    /** Free-form structured payload. Serialized into the `FailedSignal.payload`
     *  jsonb column by the caller's Prisma client. */
    payload: Record<string, unknown>;
    /** Optional log target. If omitted, write-failures are silently swallowed. */
    logger?: ScanContext["logger"];
    /** Optional context tag prefix for the log line (e.g. `"property-watch-scan"`). */
    logTag?: string;
}
/**
 * Write a `FailedSignal` DLQ row. Never throws — a write-failure is logged
 * (when a logger is provided) but does not bubble. Designed to be `await`ed
 * from inside a cron loop where any thrown error would abort the remaining
 * entities.
 */
export declare function dlqRecord(writer: DlqWriter, args: DlqRecordArgs): Promise<void>;
//# sourceMappingURL=dlqRecord.d.ts.map