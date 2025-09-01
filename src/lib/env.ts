/**
 * Environment configuration utility
 * Handles secure access to environment variables
 */

export const env = {
  // Supabase configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID || '',
  
  // Google AI API key
  GOOGLE_AI_API_KEY: import.meta.env.VITE_GOOGLE_AI_API_KEY || '',
  
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
      allConfigured: env.isSupabaseConfigured() && env.isGeminiConfigured()
    };
  }
};

export default env;
