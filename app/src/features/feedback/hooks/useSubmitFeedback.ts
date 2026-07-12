import { useMutation } from "@tanstack/react-query";
import { submitFeedback, type SubmitFeedbackInput } from "../api/feedbackApi";

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (input: SubmitFeedbackInput) => submitFeedback(input),
  });
}
