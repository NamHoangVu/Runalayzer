type RequiredServerEnvVar =
  "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "APP_PASSWORD" | "SESSION_SECRET";

function readEnv(name: RequiredServerEnvVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Set it in .env.local (see .env.example).`,
    );
  }
  return value;
}

/**
 * Lazily-validated server-side env vars. Each getter throws a clear error the
 * first time it's actually used if the variable is missing, instead of
 * failing deep inside a request handler with an opaque error.
 */
export const env = {
  get SUPABASE_URL() {
    return readEnv("SUPABASE_URL");
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return readEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get APP_PASSWORD() {
    return readEnv("APP_PASSWORD");
  },
  get SESSION_SECRET() {
    return readEnv("SESSION_SECRET");
  },
};
