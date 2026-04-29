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

// Demo mode data
const demoData = {
  "a4 paper": {
    "product": "A4 Paper Rim 70 GSM",
    "lowestPrice": "2,500 PKR",
    "averagePrice": "3,200 PKR",
    "sites": [
      { "name": "Daraz", "url": "https://daraz.pk", "price": "2,500 PKR", "priceNum": 2500, "trustScore": 92, "manipulationRisk": "Low", "riskReason": "Largest marketplace with verified sellers" },
      { "name": "OLX", "url": "https://olx.com.pk", "price": "2,800 PKR", "priceNum": 2800, "trustScore": 75, "manipulationRisk": "Medium", "riskReason": "Peer-to-peer, less verification" },
      { "name": "Goto", "url": "https://goto.com.pk", "price": "3,000 PKR", "priceNum": 3000, "trustScore": 85, "manipulationRisk": "Low", "riskReason": "Established wholesale platform" },
      { "name": "Amazon", "url": "https://amazon.com", "price": "3,500 PKR", "priceNum": 3500, "trustScore": 95, "manipulationRisk": "Low", "riskReason": "International giant with strict QC" },
      { "name": "AliExpress", "url": "https://aliexpress.com", "price": "2,200 PKR", "priceNum": 2200, "trustScore": 70, "manipulationRisk": "High", "riskReason": "Bulk pricing, long shipping times" }
    ],
    "advice": "Daraz Sy lein — best price + trusted seller. AliExpress sasta hai par shipping 30 din lagi. Local shops check karein bhi!"
  },
  "copymate": {
    "product": "Copymate A4 Paper Rim 70 GSM",
    "lowestPrice": "2,400 PKR",
    "averagePrice": "3,100 PKR",
    "sites": [
      { "name": "Daraz", "url": "https://daraz.pk", "price": "2,400 PKR", "priceNum": 2400, "trustScore": 93, "manipulationRisk": "Low", "riskReason": "Official Copymate store" },
      { "name": "Local Shop (Saddar)", "url": "#", "price": "2,600 PKR", "priceNum": 2600, "trustScore": 88, "manipulationRisk": "Low", "riskReason": "Direct manufacturer distributor" }
    ],
    "advice": "Copymate official Daraz store sy lejayein. Quality guaranteed aur overnight delivery available!"
  }
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { product } = req.body;
  if (!product) return res.status(400).json({ error: "Product name required" });

  // Demo mode - check if product matches demo data
  const demoKey = product.toLowerCase();
  for (const [key, data] of Object.entries(demoData)) {
    if (demoKey.includes(key) || key.includes(demoKey)) {
      return res.status(200).json(data);
    }
  }

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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    if (result.error) {
      return res.status(500).json({ error: result.error.message || "API error" });
    }

    if (!result.content || !Array.isArray(result.content)) {
      return res.status(500).json({ error: "Invalid API response: " + JSON.stringify(result) });
    }

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
    return res.status(500).json({ 
      error: "Demo mode: No credits. Only 'A4 paper' and 'copymate' work. Add $5 for live search!",
      message: err.message
    });
  }
};
