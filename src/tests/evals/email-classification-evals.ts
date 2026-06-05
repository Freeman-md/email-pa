import { Email } from "@/shared/types";

type ExpectedStatus =
  | "rejection"
  | "interview_invitation"
  | "assessment"
  | "generic_update";

export type EmailClassificationEvalCase = {
  id: string;
  email: Email;
  expectedRelevance: boolean;
  expectedStatus?: ExpectedStatus;
  note: string;
};

export const emailClassificationEvals: EmailClassificationEvalCase[] = [
  {
    id: "rejection-clear",
    email: {
      message_id: "eval-1",
      subject: "Update on your application",
      sender_name: "Acme Recruiting",
      sender_address: "recruiting@acme.com",
      body_preview:
        "We appreciate your interest, but we have decided not to move forward.",
      body:
        "Thank you for taking the time to apply. After careful consideration, we have decided not to move forward with your application.",
    },
    expectedRelevance: true,
    expectedStatus: "rejection",
    note: "Clear rejection language from an application workflow.",
  },
  {
    id: "interview-invite-clear",
    email: {
      message_id: "eval-2",
      subject: "Interview invitation for Backend Engineer",
      sender_name: "Hiring Team",
      sender_address: "hiring@company.com",
      body_preview:
        "We would like to schedule a 45-minute interview with you next week.",
      body:
        "Thank you for applying. We would like to schedule a 45-minute interview with you next week. Please share your availability.",
    },
    expectedRelevance: true,
    expectedStatus: "interview_invitation",
    note: "Direct interview scheduling request.",
  },
  {
    id: "assessment-clear",
    email: {
      message_id: "eval-3",
      subject: "Complete your coding assessment",
      sender_name: "Talent Team",
      sender_address: "talent@startup.com",
      body_preview:
        "Please complete the attached assessment within the next 5 days.",
      body:
        "As the next step in our process, please complete the coding assessment within the next 5 days using the link below.",
    },
    expectedRelevance: true,
    expectedStatus: "assessment",
    note: "Application-stage assessment request.",
  },
  {
    id: "generic-update-clear",
    email: {
      message_id: "eval-4",
      subject: "Your application is under review",
      sender_name: "Recruiting Operations",
      sender_address: "ops@employer.com",
      body_preview:
        "Your application has been received and is currently being reviewed.",
      body:
        "Thank you for your application. Your application has been received and is currently being reviewed by our hiring team.",
    },
    expectedRelevance: true,
    expectedStatus: "generic_update",
    note: "Relevant application update without rejection/interview/assessment semantics.",
  },
  {
    id: "newsletter-irrelevant",
    email: {
      message_id: "eval-5",
      subject: "Top engineering jobs this week",
      sender_name: "Jobs Digest",
      sender_address: "newsletter@jobs.example",
      body_preview:
        "Explore this week's curated software engineering openings.",
      body:
        "Explore this week's curated software engineering openings and career resources tailored for developers.",
    },
    expectedRelevance: false,
    note: "Newsletter and job digest, not an application workflow email.",
  },
  {
    id: "job-alert-irrelevant",
    email: {
      message_id: "eval-6",
      subject: "New jobs matching your search",
      sender_name: "LinkedIn Jobs",
      sender_address: "jobs-noreply@linkedin.com",
      body_preview:
        "We found new roles that match your Backend Engineer search.",
      body:
        "We found new roles that match your Backend Engineer search. View the latest openings and apply now.",
    },
    expectedRelevance: false,
    note: "Automated job alert, not tied to an existing application.",
  },
  {
    id: "recruiter-outreach-borderline",
    email: {
      message_id: "eval-7",
      subject: "Backend Engineer opportunity at Northstar",
      sender_name: "Jane Recruiter",
      sender_address: "jane@agency.com",
      body_preview:
        "I came across your profile and think you could be a fit for a role we are hiring for.",
      body:
        "I came across your profile and think you could be a fit for a Backend Engineer role we are hiring for. If interested, reply and we can discuss.",
    },
    expectedRelevance: true,
    expectedStatus: "generic_update",
    note: "Borderline recruiter outreach that should still count as relevant job-related communication.",
  },
  {
    id: "ambiguous-followup",
    email: {
      message_id: "eval-8",
      subject: "Following up on your recent application",
      sender_name: "Hiring Team",
      sender_address: "hiring@productco.com",
      body_preview:
        "We wanted to follow up regarding your recent application.",
      body:
        "We wanted to follow up regarding your recent application. Our team is still reviewing candidates and we will share next steps soon.",
    },
    expectedRelevance: true,
    expectedStatus: "generic_update",
    note: "Relevant but ambiguous update with no strong status transition.",
  },
  {
    id: "account-security-irrelevant",
    email: {
      message_id: "eval-9",
      subject: "New sign-in to your account",
      sender_name: "Indeed",
      sender_address: "security@indeed.com",
      body_preview:
        "We noticed a new sign-in to your account from a new device.",
      body:
        "We noticed a new sign-in to your account from a new device. If this was not you, please reset your password immediately.",
    },
    expectedRelevance: false,
    note: "Job platform security email, not a hiring workflow event.",
  },
  {
    id: "interview-reschedule",
    email: {
      message_id: "eval-10",
      subject: "Interview reschedule request",
      sender_name: "Talent Partner",
      sender_address: "talent@scaleup.com",
      body_preview:
        "We need to reschedule your interview to Thursday at 2 PM.",
      body:
        "Due to a conflict, we need to reschedule your interview to Thursday at 2 PM. Please confirm if that works for you.",
    },
    expectedRelevance: true,
    expectedStatus: "interview_invitation",
    note: "Interview logistics should still map to interview invitation status.",
  },
];
