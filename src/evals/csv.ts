import fs from "node:fs/promises";
import path from "node:path";
import { Email, GraphEmail } from "@/shared/types";
import {
  GraphEmailCsvRow,
  ProcessedEmailCsvRow,
} from "./types";

function escapeCsvValue(value: string) {
  const escaped = value.replace(/"/g, '""');

  if (/[",\n]/.test(value)) {
    return `"${escaped}"`;
  }

  return escaped;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);

  return values;
}

export async function readCsv<T extends Record<string, string>>(
  filePath: string
): Promise<T[]> {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {} as T;

    headers.forEach((header, index) => {
      row[header as keyof T] = (values[index] ?? "") as T[keyof T];
    });

    return row;
  });
}

export async function writeCsv<T extends Record<string, string>>(
  filePath: string,
  rows: T[]
) {
  if (rows.length === 0) {
    await fs.writeFile(filePath, "", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");

  const dataLines = rows.map((row) =>
    headers.map((header) => escapeCsvValue(row[header] ?? "")).join(",")
  );

  const content = [headerLine, ...dataLines].join("\n");

  await fs.writeFile(filePath, content, "utf8");
}

export function mapGraphEmailCsvRowToGraphEmail(
  row: GraphEmailCsvRow
): GraphEmail {
  return {
    id: row.id,
    subject: row.subject || undefined,
    receivedDateTime: row.received_datetime || undefined,
    webLink: row.web_link || undefined,
    bodyPreview: row.body_preview || undefined,
    body: row.body
      ? {
          contentType: "text",
          content: row.body,
        }
      : undefined,
    sender: {
      emailAddress: {
        name: row.sender_name || undefined,
        address: row.sender_address || undefined,
      },
    },
  };
}

export function mapProcessedEmailToCsvRow(
  processedEmail: Pick<Email, "message_id" | "status">
): ProcessedEmailCsvRow {
  return {
    message_id: processedEmail.message_id,
    status: processedEmail.status,
  };
}

export function resolveEvalDatasetPath(
  datasetCategory: string,
  fileName: string
) {
  return path.resolve(process.cwd(), "evals", datasetCategory, fileName);
}