type JsonPrimitive = string | number | boolean | null;

interface JsonObject {
  [key: string]: JsonValue;
}

type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type NormalizedService = {
  key: string;
  label: string;
  valueText?: string;
  rawValue: JsonValue;
};

function humanizeKey(key: string): string {
  const withSpaces = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isPositiveNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

export function normalizeServices(
  input: unknown,
  opts?: {
    labelMap?: Record<string, string>;
    includeNestedObjects?: boolean;
  }
): NormalizedService[] {
  const labelMap = opts?.labelMap ?? {};
  const includeNestedObjects = opts?.includeNestedObjects ?? false;

  if (!input || typeof input !== "object" || Array.isArray(input)) return [];

  const obj = input as JsonObject;

  const out: NormalizedService[] = [];

  for (const [key, rawValue] of Object.entries(obj)) {
    if (rawValue === undefined || rawValue === null) continue;

    if (typeof rawValue === "boolean") {
      if (rawValue === true) {
        out.push({
          key,
          label: labelMap[key] ?? humanizeKey(key),
          valueText: "Yes",
          rawValue,
        });
      }
      continue;
    }

    if (isNonEmptyString(rawValue)) {
      out.push({
        key,
        label: labelMap[key] ?? humanizeKey(key),
        valueText: rawValue.trim(),
        rawValue,
      });
      continue;
    }

    if (isPositiveNumber(rawValue)) {
      out.push({
        key,
        label: labelMap[key] ?? humanizeKey(key),
        valueText: String(rawValue),
        rawValue,
      });
      continue;
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length > 0) {
        out.push({
          key,
          label: labelMap[key] ?? humanizeKey(key),
          valueText: `${rawValue.length}`,
          rawValue,
        });
      }
      continue;
    }

    if (typeof rawValue === "object") {
      const keys = Object.keys(rawValue as object);
      if (includeNestedObjects && keys.length > 0) {
        out.push({
          key,
          label: labelMap[key] ?? humanizeKey(key),
          valueText: `${keys.length}`,
          rawValue,
        });
      }
      continue;
    }
  }

  return out;
}
