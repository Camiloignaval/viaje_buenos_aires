import { platformRequest } from "@/services/platformClient";

export type FeedbackCategory = "suggestion" | "problem" | "question" | "other";

export interface SubmitFeedbackInput {
  category: FeedbackCategory;
  message: string;
  tripId?: string;
  page?: string;
  pageUrl?: string;
  locale?: string;
  timezone?: string;
  appVersion?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
}

export function submitFeedback(input: SubmitFeedbackInput) {
  return platformRequest<{
    feedback: { id: string; status: string; createdAt: string };
    message: string;
  }>("/api/feedback", {
    method: "POST",
    body: input,
  });
}
