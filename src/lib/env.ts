/**
 * Environment configuration utility
 * Handles secure access to environment variables with fallbacks for different deployment scenarios
 */

// Helper function to get environment variable with multiple fallbacks
const getEnvVar = (viteKey: string, plainKey: string, fallback = ''): string => {
  // Try Vite-prefixed version first (for development)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
    return import.meta.env[viteKey];
  }
  
  // Try plain version (for production/Vercel)
  if (typeof process !== 'undefined' && process.env && process.env[plainKey]) {
    return process.env[plainKey];
  }
  
  // Try global env (fallback)
  if (typeof window !== 'undefined' && (window as any).env && (window as any).env[plainKey]) {
    return (window as any).env[plainKey];
  }
  
  return fallback;
};

export const env = {
  // Supabase configuration with fallbacks
  SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL', 'SUPABASE_URL', 'https://cjvoiyjpyjagfrxtispo.supabase.co'),
  SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqdm9peWpweWphZ2ZyeHRpc3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjE0NTcsImV4cCI6MjA3MjEzNzQ1N30.9eWugE3yXiqnZINFeZPBllBujaHVYkPWJrpNr4TQPZQ'),
  SUPABASE_PROJECT_ID: getEnvVar('VITE_SUPABASE_PROJECT_ID', 'SUPABASE_PROJECT_ID', 'cjvoiyjpyjagfrxtispo'),
  
  // Google AI API key
  GOOGLE_AI_API_KEY: getEnvVar('VITE_GOOGLE_AI_API_KEY', 'GOOGLE_AI_API_KEY'),
  
  // Validation functions
  isSupabaseConfigured: () => {
    return !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_PROJECT_ID);
  },
  
  isGeminiConfigured: () => {
    return !!env.GOOGLE_AI_API_KEY;
  },
  
  // Get configuration status
  getStatus: () => {
    return {
      supabase: env.isSupabaseConfigured(),
      gemini: env.isGeminiConfigured(),
      allConfigured: env.isSupabaseConfigured() && env.isGeminiConfigured(),
      environment: typeof process !== 'undefined' ? 'node' : 'browser',
      values: {
        supabaseUrl: env.SUPABASE_URL ? '✓ Set' : '✗ Missing',
        supabaseKey: env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
        projectId: env.SUPABASE_PROJECT_ID ? '✓ Set' : '✗ Missing',
        geminiKey: env.GOOGLE_AI_API_KEY ? '✓ Set' : '✗ Missing'
      }
    };
  }
};

export default env;
