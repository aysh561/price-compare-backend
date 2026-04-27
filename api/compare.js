const https = require("https");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { product } = req.body;
  if (!product) {
    return res.status(400).json({ error: "Product name required" });
  }

  const prompt = `You are a price comparison analyst for Pakistani online shoppers. Search the web for the product: "${product}"

Find prices from at least 6-8 different websites (Daraz, OLX, Amazon, AliExpress, Goto, Symbios, iShopping, local Pakistani shops, etc.).

For each website, evaluate:
1. Actual price (in PKR if Pakistani site, otherwise original currency)
2. Trust score 0-100 (based on: domain reputation, reviews, return policy, SSL, known brand)
3. Manipulation risk: Low / Medium / High
4. One sentence reason for manipulation risk

Respond ONLY in this exact JSON, no markdown:
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
  "advice": "2-3 sentence buying recommendation in Urdu/English mixed"
}`;

  const requestBody = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => (data += chunk));
        apiRes.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Invalid JSON from Anthropic"));
          }
        });
      });

      apiReq.on("error", reject);
      apiReq.write(requestBody);
      apiReq.end();
    });

    const textBlock = (result.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const match = textBlock.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse AI response");

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
