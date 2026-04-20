// REPLACEMENT CODE FOR LINE 876 onwards in timetableGenerator.ts
// Replace from "let lastError: Error | null = null;" through the end of the for loop

    let lastError: Error | null = null;

    for (const modelName of MODELS_TO_TRY) {
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let retryDelay = 2000;

      while (retryCount <= MAX_RETRIES) {
        try {
          if (retryCount > 0) {
            console.log(`Retry ${retryCount}/${MAX_RETRIES} for ${modelName} after ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            console.log(`Trying Gemini model: ${modelName}...`);
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.googleApiKey
              },
              body: requestBody
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            const statusCode = response.status;
            
            if (statusCode === 401 || statusCode === 403) {
              throw new Error(`API key error (${statusCode}): ${errorText}. Please check your Gemini API key.`);
            }
            
            if (statusCode === 503 && retryCount < MAX_RETRIES) {
              console.warn(`Model ${modelName} returned 503 (server overload), retrying...`);
              retryCount++;
              retryDelay *= 2;
              continue;
            }
            
            console.warn(`Model ${modelName} returned ${statusCode}, trying next model...`);
            lastError = new Error(`${modelName}: HTTP ${statusCode} - ${errorText.substring(0, 200)}`);
            break;
          }

          const result = await response.json();

          if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.warn(`Model ${modelName} returned no candidates, trying next model...`);
            lastError = new Error(`${modelName}: No candidates in response`);
            break;
          }

          let generatedText = result.candidates[0].content.parts[0].text;
          generatedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();

          console.log(`Model ${modelName} succeeded. Response length: ${generatedText.length}`);
          console.log('Gemini Raw Response (first 500 chars):', generatedText.substring(0, 500));

          const parsedData = extractJsonArray(generatedText);

          if (!parsedData || !Array.isArray(parsedData)) {
            console.error('AI Response Text (Failed to find JSON array):', generatedText);
            const snippet = generatedText.substring(0, 200).replace(/\n/g, ' ');
            lastError = new Error(`${modelName}: No JSON array in response. Snippet: "${snippet}"`);
            break;
          }

          return parsedData;

        } catch (err: any) {
          if (err?.message?.includes('API key error')) throw err;
          console.warn(`Model ${modelName} threw an error:`, err?.message);
          lastError = err instanceof Error ? err : new Error(String(err));
          break;
        }
      }
    }

    throw new Error(
      `All Gemini models failed to generate a timetable. Last error: ${lastError?.message || 'Unknown error'}. ` +
      `Please check your API key or try again in a few minutes.`
    );
