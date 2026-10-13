import { z } from "zod";

export const tutorBody = z.object({
  studentId: z.string().uuid(), levelId: z.string().regex(/^[dt][1-6]$/),
  subjectId: z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/).optional(),
  topicId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/).optional(),
  resourceId: z.string().min(1).max(100).optional(),
  conversationId: z.string().uuid().optional(),
  homeworkId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(1200),
});
