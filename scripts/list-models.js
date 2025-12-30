
const apiKey = "AIzaSyAAJMrgjVCZ9K1tAPGfjHWsuGNgv3svth4";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("Listing Available Models...");
console.log(`URL: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

async function listModels() {
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (data.models) {
        console.log("\nAvailable Models:");
        data.models.forEach(model => {
            if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ${model.name} (${model.version})`);
            }
        });
    } else {
        console.log("Response Body:");
        console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
