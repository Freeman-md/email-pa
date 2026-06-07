import { createRecord, updateRecord } from "@/integrations/airtable/client";
import { AirtableRecord, Job, JobStatus } from "@/shared/types";

const JOBS_TABLE = "Jobs";

export async function createJob(
  fields: Job
): Promise<AirtableRecord<Job>> {
  const response = await createRecord<Job>(JOBS_TABLE, fields);

  return response.records[0];
}

export async function updateJobStatus(
  recordId: string,
  status: JobStatus
): Promise<AirtableRecord<Job>> {
  return updateRecord<Job>(JOBS_TABLE, recordId, { status });
}
