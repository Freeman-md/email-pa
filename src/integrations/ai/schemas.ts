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
    action: z.enum(["update", "create"]),
    status: z.enum(["Rejection", "Assessment", "Interviewing"]),
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
  });
