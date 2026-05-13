"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dlqRecord = dlqRecord;
/**
 * Write a `FailedSignal` DLQ row. Never throws — a write-failure is logged
 * (when a logger is provided) but does not bubble. Designed to be `await`ed
 * from inside a cron loop where any thrown error would abort the remaining
 * entities.
 */
async function dlqRecord(writer, args) {
    try {
        await writer.failedSignal.create({
            data: {
                tenantId: args.tenantId,
                signalType: args.signalType,
                priority: args.priority ?? "low",
                payload: args.payload,
            },
        });
    }
    catch (err) {
        args.logger?.error(`[${args.logTag ?? "dlq"}] dlq-write-failed`, {
            tenantId: args.tenantId,
            signalType: args.signalType,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
//# sourceMappingURL=dlqRecord.js.map