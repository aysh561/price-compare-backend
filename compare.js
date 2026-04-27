export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const product = body.product;

    if (!product) {
      return new Response(JSON.stringify({ error: "Product name required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
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

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await anthropicRes.json();
    const textBlock = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const match = textBlock.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse response");

    const result = JSON.parse(match[0]);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
          }
