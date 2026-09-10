import { z } from "zod";

import { BUILD_DURATION_VALUES } from "@/types/spitball";
import { ExcludedIdeaSchema, GitHubUsernameSchema } from "./schemas";

export const LiveBuildDurationSchema = z.enum(BUILD_DURATION_VALUES);

export const LiveSpitballRequestSchema = z
  .object({
    username: GitHubUsernameSchema,
    topic: z.string().trim().max(200).optional().transform((value) => value || undefined),
    duration: LiveBuildDurationSchema,
    excludedIdeas: z.array(ExcludedIdeaSchema).max(50).default([]),
  })
  .strict();
