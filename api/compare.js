const https = require("https");

function makeRequest(body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Invalid JSON from Anthropic"));
        }
      });
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { product } = req.body;
  if (!product) return res.status(400).json({ error: "Product name required" });

  const prompt = `Search the web and find prices for "${product}" from Pakistani and international e-commerce websites like Daraz, OLX, Goto, Symbios, iShopping, Amazon, AliExpress etc.

For each website found, provide:
1. Price in PKR (or original currency)
2. Trust score 0-100
3. Manipulation risk: Low/Medium/High
4. One sentence reason

Respond ONLY in this exact JSON format with no extra text:
{
  "product": "product name",
  "lowestPrice": "XXX PKR",
  "averagePrice": "XXX PKR",
  "sites": [
    {
      "name": "Website Name",
      "url": "https://...",
      "price": "price string",
      "priceNum": 1234,
      "trustScore": 85,
      "manipulationRisk": "Low",
      "riskReason": "brief reason"
    }
  ],
  "advice": "2-3 sentence buying recommendation in Urdu/English"
}`;

  try {
    const messages = [{ role: "user", content: prompt }];

    let finalText = "";
    let attempts = 0;

    while (attempts < 5) {
      attempts++;
      const result = await makeRequest({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: messages,
      });

      // Add assistant response to messages
      messages.push({ role: "assistant", content: result.content });

      // Check stop reason
      if (result.stop_reason === "end_turn") {
        // Extract text from final response
        for (const block of result.content) {
          if (block.type === "text") {
            finalText += block.text;
          }
        }
        break;
      } else if (result.stop_reason === "tool_use") {
        // Add tool results and continue
        const toolResults = [];
        for (const block of result.content) {
          if (block.type === "tool_use") {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: "Search completed",
            });
          }
        }
        if (toolResults.length > 0) {
          messages.push({ role: "user", content: toolResults });
        }
      } else {
        // Extract any text available
        for (const block of result.content) {
          if (block.type === "text") {
            finalText += block.text;
          }
        }
        break;
      }
    }

    if (!finalText) throw new Error("No response from AI");

    const match = finalText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse AI response");

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
