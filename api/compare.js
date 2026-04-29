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

  const prompt = `Find prices for "${product}" from Pakistani e-commerce websites like Daraz, Goto, Symbios, iShopping, OLX, and international sites like Amazon, AliExpress.

For each website provide trust score and manipulation risk assessment.

Respond ONLY in this exact JSON, nothing else before or after:
{
  "product": "product name",
  "lowestPrice": "XXX PKR",
  "averagePrice": "XXX PKR",
  "sites": [
    {
      "name": "Website Name",
      "url": "https://example.com",
      "price": "1500 PKR",
      "priceNum": 1500,
      "trustScore": 85,
      "manipulationRisk": "Low",
      "riskReason": "Well known platform with verified reviews"
    }
  ],
  "advice": "Buying recommendation in Urdu/English mixed"
}`;

  try {
    const result = await makeRequest({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    // Check for API error
    if (result.error) {
      return res.status(500).json({ error: result.error.message || "API error" });
    }

    // Check content exists
    if (!result.content || !Array.isArray(result.content)) {
      return res.status(500).json({ error: "Invalid API response: " + JSON.stringify(result) });
    }

    // Extract text
    const finalText = result.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    if (!finalText) throw new Error("Empty response from AI");

    const match = finalText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not find JSON in response");

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
