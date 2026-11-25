/** Minimal SQL literal helpers for generated seed files (values are ours, but escape anyway). */

export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function sqlValue(value: string | number | boolean | null): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number in SQL: ${value}`);
    return String(value);
  }
  return sqlString(value);
}

export function sqlInsert(
  table: string,
  row: Readonly<Record<string, string | number | boolean | null>>,
  mode: "INSERT" | "INSERT OR REPLACE" = "INSERT",
): string {
  if (!/^[a-z_]+$/.test(table)) throw new Error(`Bad table name: ${table}`);
  const cols = Object.keys(row);
  for (const c of cols) if (!/^[a-z_]+$/.test(c)) throw new Error(`Bad column name: ${c}`);
  return `${mode} INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => sqlValue(row[c]!)).join(", ")});`;
}
