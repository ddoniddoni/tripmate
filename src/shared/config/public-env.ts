import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

const supabasePublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
});

const supabaseServiceRoleEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
});

const result = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  throw new Error(`Invalid public environment variables: ${details}`);
}

export const publicEnv = result.data;

export function getSupabasePublicConfig() {
  const supabaseEnv = supabasePublicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  if (!supabaseEnv.success) {
    throw new Error("Supabase public environment variables are invalid.");
  }

  const key =
    supabaseEnv.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    supabaseEnv.data.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseEnv.data.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and a Supabase public key must be configured before using authentication.",
    );
  }

  return { key, url: supabaseEnv.data.NEXT_PUBLIC_SUPABASE_URL };
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleEnv = supabaseServiceRoleEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!serviceRoleEnv.success) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be configured for development direct sign-in.");
  }

  return serviceRoleEnv.data.SUPABASE_SERVICE_ROLE_KEY;
}
