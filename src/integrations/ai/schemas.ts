import { z } from "zod"

export const relevanceSchema = z.object({
    isRelevant: z.boolean(),
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z.array(z.string()).max(3)
})

export const statusSchema = z.object({
  status: z.enum([
    "rejection",
    "interview_invitation",
    "assessment",
    "generic_update",
  ]),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(z.string()).max(3),
});

export const jobRecordResolutionSchema = z
  .object({
    action: z.enum(["update", "create", "skip"]),
    status: z
      .enum(["Rejection", "Assessment", "Interviewing", "Applied"])
      .nullable(),
    target_record_id: z.string().trim().min(1).nullable(),
    job_title: z.string().trim().min(1).nullable(),
    company_name: z.string().trim().min(1).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === "update" && !value.target_record_id) {
      context.addIssue({
        code: "custom",
        message: "target_record_id is required when action is update",
        path: ["target_record_id"],
      });
    }

    if (value.action === "update") {
      if (!value.status) {
        context.addIssue({
          code: "custom",
          message: "status is required when action is update",
          path: ["status"],
        });
      }

      if (value.job_title) {
        context.addIssue({
          code: "custom",
          message: "job_title must be null when action is update",
          path: ["job_title"],
        });
      }

      if (value.company_name) {
        context.addIssue({
          code: "custom",
          message: "company_name must be null when action is update",
          path: ["company_name"],
        });
      }
    }

    if (value.action === "create") {
      if (!value.status) {
        context.addIssue({
          code: "custom",
          message: "status is required when action is create",
          path: ["status"],
        });
      }

      if (!value.job_title) {
        context.addIssue({
          code: "custom",
          message: "job_title is required when action is create",
          path: ["job_title"],
        });
      }

      if (!value.company_name) {
        context.addIssue({
          code: "custom",
          message: "company_name is required when action is create",
          path: ["company_name"],
        });
      }

      if (value.target_record_id) {
        context.addIssue({
          code: "custom",
          message: "target_record_id must be null when action is create",
          path: ["target_record_id"],
        });
      }
    }

    if (value.action === "skip") {
      if (value.status) {
        context.addIssue({
          code: "custom",
          message: "status must be null when action is skip",
          path: ["status"],
        });
      }

      if (value.target_record_id) {
        context.addIssue({
          code: "custom",
          message: "target_record_id must be null when action is skip",
          path: ["target_record_id"],
        });
      }

      if (value.job_title) {
        context.addIssue({
          code: "custom",
          message: "job_title must be null when action is skip",
          path: ["job_title"],
        });
      }

      if (value.company_name) {
        context.addIssue({
          code: "custom",
          message: "company_name must be null when action is skip",
          path: ["company_name"],
        });
      }
    }
  });
