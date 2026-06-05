import fs from "node:fs/promises";
import path from "node:path";
import { processEmail } from "@/process-email";
import {
  mapGraphEmailCsvRowToGraphEmail,
  mapProcessedEmailToCsvRow,
  readCsv,
  resolveEvalDatasetPath,
  writeCsv,
} from "@/evals/csv";
import {
  GraphEmailCsvRow,
  ProcessedEmailCsvRow,
} from "@/evals/types";

async function runDatasetCategory(datasetCategory: string) {
  const graphEmailsPath = resolveEvalDatasetPath(
    datasetCategory,
    "graph-emails.csv"
  );

  const annotatedEmailsPath = resolveEvalDatasetPath(
    datasetCategory,
    "annotated-emails.csv"
  );

  const processedEmailsPath = resolveEvalDatasetPath(
    datasetCategory,
    "processed-emails.csv"
  );

  const graphEmailRows = await readCsv<GraphEmailCsvRow>(graphEmailsPath);
  const annotatedEmailRows = await readCsv<ProcessedEmailCsvRow>(annotatedEmailsPath);

  console.log("Loaded graph email rows", graphEmailRows.length);
  console.log("Loaded annotated email rows", annotatedEmailRows.length);

  const graphEmails = graphEmailRows.map(mapGraphEmailCsvRowToGraphEmail);

  const processedEmailRows: ProcessedEmailCsvRow[] = [];

  for (const graphEmail of graphEmails) {
    const processedEmail = await processEmail(graphEmail);
    processedEmailRows.push(mapProcessedEmailToCsvRow(processedEmail));
  }

  await writeCsv(processedEmailsPath, processedEmailRows);

  const annotatedByMessageId = new Map(
    annotatedEmailRows.map((row) => [row.message_id, row])
  );

  const mismatches: Array<{
    message_id: string;
    expected: ProcessedEmailCsvRow["status"];
    actual: ProcessedEmailCsvRow["status"];
  }> = [];

  let matches = 0;

  for (const processedRow of processedEmailRows) {
    const annotatedRow = annotatedByMessageId.get(processedRow.message_id);

    if (!annotatedRow) {
      mismatches.push({
        message_id: processedRow.message_id,
        expected: undefined,
        actual: processedRow.status,
      });
      continue;
    }

    if (annotatedRow.status === processedRow.status) {
      matches += 1;
    } else {
      mismatches.push({
        message_id: processedRow.message_id,
        expected: annotatedRow.status,
        actual: processedRow.status,
      });
    }
  }

  console.log("Eval summary", {
    datasetCategory,
    total: processedEmailRows.length,
    matches,
    mismatches: mismatches.length,
  });

  if (mismatches.length > 0) {
    console.log("Eval mismatches", mismatches);
  }
}

const evalsRoot = path.resolve(process.cwd(), "evals");
const entries = await fs.readdir(evalsRoot, { withFileTypes: true });
const datasetCategories = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const datasetCategory of datasetCategories) {
  await runDatasetCategory(datasetCategory);
}
