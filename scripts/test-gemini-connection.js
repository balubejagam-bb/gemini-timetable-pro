
const apiKey = "AIzaSyAK2agWVu3zeYruOlumyXXEayOqV2rWBzE";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

console.log("Testing Gemini API Connection...");
console.log(`URL: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

async function testConnection() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Return a JSON object with a key 'message' and value 'Success'."
          }]
        }],
        generationConfig: {
            maxOutputTokens: 50,
            responseMimeType: "application/json"
        }
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log("Response Body:");
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
        console.error("❌ API Call Failed");
    } else {
        console.log("✅ API Call Successful");
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

testConnection();
