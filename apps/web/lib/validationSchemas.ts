import { z } from 'zod';

// Exercise log validation schema
export const ExerciseLogSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  instrument: z.string().optional(),
  duration_minutes: z.number().min(1, "Duration is required"),
  difficulty: z.enum(["easy", "medium", "hard"], {
    errorMap: () => ({ message: "Please select a difficulty level" }),
  }).optional().default("medium"),
  notes: z.string().optional(),
  mood: z.enum(["good", "normal", "bad"], {
    errorMap: () => ({ message: "Please select your mood" }),
  }).optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
});

// Type export
export type ExerciseLogFormData = z.infer<typeof ExerciseLogSchema>; 