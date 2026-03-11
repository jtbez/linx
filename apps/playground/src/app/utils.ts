import type { HydratedEntity } from "@linxhq/sdk";
import { RootFactoid } from "@linxhq/sdk";

export type LogEntry = {
  id: number;
  label: string;
  code: string;
  result: string;
  status: "success" | "error";
  timestamp: Date;
};

let logId = 0;

export function createLogEntry(
  label: string,
  code: string,
  result: unknown,
  status: "success" | "error"
): LogEntry {
  return {
    id: ++logId,
    label,
    code,
    result: typeof result === "string" ? result : JSON.stringify(result, null, 2),
    status,
    timestamp: new Date(),
  };
}

export function formatAttributes(entity: HydratedEntity): Record<string, unknown> {
  const attrs = entity.getAttributes();
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (val instanceof RootFactoid) {
      out[key] = {
        value: val.current,
        confidence: val.confidenceScore,
        factoidId: val.id,
      };
    } else {
      const sub: Record<string, unknown> = {};
      for (const [subKey, subVal] of Object.entries(val as Record<string, RootFactoid>)) {
        sub[subKey] = {
          value: subVal.current,
          confidence: subVal.confidenceScore,
          factoidId: subVal.id,
        };
      }
      out[key] = sub;
    }
  }
  return out;
}

export function summarizeEntity(entity: HydratedEntity) {
  return {
    id: entity.id,
    type: entity.type,
    additionalType: entity.additionalType,
    ...formatAttributes(entity),
  };
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
