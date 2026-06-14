export function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function hasSupabaseEnv() {
  return Boolean(getSupabaseEnvError() === null);
}

export function getSupabaseEnvError() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname.endsWith(".supabase.co")) {
      return "NEXT_PUBLIC_SUPABASE_URL should be your Supabase project URL.";
    }
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL.";
  }

  return null;
}
