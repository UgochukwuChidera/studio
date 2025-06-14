
import { z } from 'zod';

export const BloomLevelSchema = z.enum([
  "Remember", 
  "Understand", 
  "Apply", 
  "Analyze", 
  "Evaluate", 
  "Create"
]).describe("The desired cognitive complexity level based on Bloom's Taxonomy. If 'None' or not provided, a general difficulty will be aimed for based on content.");
export type BloomLevel = z.infer<typeof BloomLevelSchema>;

// This file can be expanded with other shared AI-related schemas or types as needed.
