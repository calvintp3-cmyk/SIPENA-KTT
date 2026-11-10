import { auditLogs } from "../db/schema";

export type AuditAction = "CREATE" | "APPROVE" | "REJECT" | "EDIT" | "BATCH_APPROVE" | "BATCH_REJECT";

export interface AuditEntryInput {
  phenomenonId: string;
  userId: string | null;
  action: AuditAction;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

type DbTransaction = Parameters<Parameters<typeof import("../db").db.transaction>[0]>[0];

export async function recordAuditLog(
  tx: DbTransaction | typeof import("../db").db,
  entry: AuditEntryInput
) {
  await tx.insert(auditLogs).values({
    phenomenonId: entry.phenomenonId,
    userId: entry.userId,
    action: entry.action,
    previousValues: entry.previousValues ?? null,
    newValues: entry.newValues ?? null,
    ipAddress: entry.ipAddress ?? null,
  });
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

