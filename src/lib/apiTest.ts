// Quick API key test
import { env } from "./env";

export function testApiKey() {
  console.log('=== API Key Test ===');
  console.log('Environment status:', env.getStatus());
  console.log('GOOGLE_AI_API_KEY:', env.GOOGLE_AI_API_KEY ? `${env.GOOGLE_AI_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
  console.log('Is Gemini configured:', env.isGeminiConfigured());
  
  // Test actual API call
  const testApiCall = async () => {
    try {
      const apiKey = env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('No API key found');
      }
      
      console.log('Testing API call...');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Hello, respond with just 'API working'"
              }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API response:', result);
      return { success: true, result };
      
    } catch (error) {
      console.error('API test failed:', error);
      return { success: false, error: error.message };
    }
  };
  
  return testApiCall();
}
