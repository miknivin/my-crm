import React from "react";

export type DynamicTableColumn = {
  key: string;
  header: React.ReactNode;
  className?: string;
};

export type DynamicTableRow = Record<string, unknown>;

type DynamicTableProps = {
  columns: DynamicTableColumn[];
  rows: DynamicTableRow[];
  emptyMessage?: string;
  className?: string;
};

const OMIT_KEYS = new Set(["_id", "role", "__v"]);

const stripPrivateFields = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripPrivateFields);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    Object.entries(obj).forEach(([key, val]) => {
      if (OMIT_KEYS.has(key)) return;
      next[key] = stripPrivateFields(val);
    });
    return next;
  }
  return value;
};

const labelFromKey = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

const formatDateValue = (value: Date) =>
  value.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const tryFormatDateString = (value: string): string => {
  if (!/\d{4}-\d{2}-\d{2}T/.test(value) && !/\d{4}-\d{2}-\d{2}/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return formatDateValue(parsed);
};

const renderPrimitive = (value: unknown): React.ReactNode => {
  if (value == null) return "-";
  if (typeof value === "string") return tryFormatDateString(value);
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return formatDateValue(value);
  if (React.isValidElement(value)) return value;
  return String(value);
};

const renderObjectContent = (value: Record<string, unknown>) => {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return <div className="text-xs text-gray-500 dark:text-gray-400">No details</div>;
  }
  if (entries.length === 1) {
    const [, onlyValue] = entries[0];
    return <div className="text-xs text-gray-800 dark:text-gray-100">{renderValue(onlyValue)}</div>;
  }

  return (
    <div className="grid gap-y-1 text-xs text-gray-700 dark:text-gray-200">
      {entries.map(([key, val]) => (
        <div key={key} className="grid grid-cols-[110px_1fr] gap-x-2">
          <span className="font-medium text-gray-600 dark:text-gray-300">{labelFromKey(key)}</span>
          <span className="text-gray-800 dark:text-gray-100">{renderValue(val)}</span>
        </div>
      ))}
    </div>
  );
};

const renderArrayContent = (value: unknown[]) => {
  if (value.length === 0) {
    return <div className="text-xs text-gray-500 dark:text-gray-400">No items</div>;
  }

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={`item-${index}`} className="text-xs text-gray-800 dark:text-gray-100">
          {typeof item === "object" && item !== null
            ? renderObjectContent(item as Record<string, unknown>)
            : renderPrimitive(item)}
        </div>
      ))}
    </div>
  );
};

type PillDropdownProps = {
  value: unknown;
  label: string;
};

const PillDropdown = ({ value, label }: PillDropdownProps) => {
  const cleaned = stripPrivateFields(value);
  const isArray = Array.isArray(cleaned);

  return (
    <details className="relative inline-block">
      <summary className="list-none cursor-pointer select-none rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
        {label}
      </summary>
      <div className="absolute z-20 mt-2 w-72 max-w-[75vw] rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        {isArray
          ? renderArrayContent(cleaned as unknown[])
          : renderObjectContent(cleaned as Record<string, unknown>)}
      </div>
    </details>
  );
};

const resolveLabel = (item: unknown) => {
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.name === "string" && obj.name.trim()) return obj.name;
    const nested = obj.user as Record<string, unknown> | undefined;
    if (nested && typeof nested.name === "string" && nested.name.trim()) return nested.name;
  }
  return "nivin";
};

function renderValue(value: unknown): React.ReactNode {
  if (value == null) return "-";

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, index) => (
          <PillDropdown key={`pill-${index}`} value={item} label={resolveLabel(item)} />
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    return <PillDropdown value={value} label={resolveLabel(value)} />;
  }

  return renderPrimitive(value);
}

export default function DynamicTable({
  columns,
  rows,
  emptyMessage = "No data found.",
  className = "",
}: DynamicTableProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
        Total rows: {rows.length}
      </div>
      <div
        className="max-h-[28rem] overflow-x-auto overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700"
      >
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-900/60">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 ${
                  column.className || ""
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800/40">
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column.key}`}
                    className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-200 ${
                      column.className || ""
                    }`}
                  >
                    {renderValue(row[column.key])}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={Math.max(columns.length, 1)}
                className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
