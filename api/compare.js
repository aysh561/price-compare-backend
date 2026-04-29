module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { product } = req.body;
    if (!product) {
      return res.status(400).json({ error: "Product name required" });
    }

    // Demo data
    const demoData = {
      "a4": {
        "product": "A4 Paper Rim 70 GSM",
        "lowestPrice": "2,500 PKR",
        "averagePrice": "3,200 PKR",
        "sites": [
          {
            "name": "Daraz",
            "url": "https://daraz.pk",
            "price": "2,500 PKR",
            "priceNum": 2500,
            "trustScore": 92,
            "manipulationRisk": "Low",
            "riskReason": "Largest marketplace with verified sellers"
          },
          {
            "name": "OLX",
            "url": "https://olx.com.pk",
            "price": "2,800 PKR",
            "priceNum": 2800,
            "trustScore": 75,
            "manipulationRisk": "Medium",
            "riskReason": "Peer-to-peer, less verification"
          },
          {
            "name": "Goto",
            "url": "https://goto.com.pk",
            "price": "3,000 PKR",
            "priceNum": 3000,
            "trustScore": 85,
            "manipulationRisk": "Low",
            "riskReason": "Established wholesale platform"
          },
          {
            "name": "Amazon",
            "url": "https://amazon.com",
            "price": "3,500 PKR",
            "priceNum": 3500,
            "trustScore": 95,
            "manipulationRisk": "Low",
            "riskReason": "International giant with strict QC"
          }
        ],
        "advice": "Daraz se lein - best price + trusted. Demo mode - add $5 credit for live search!"
      },
      "copymate": {
        "product": "Copymate A4 Paper Rim 70 GSM",
        "lowestPrice": "2,400 PKR",
        "averagePrice": "3,100 PKR",
        "sites": [
          {
            "name": "Daraz",
            "url": "https://daraz.pk",
            "price": "2,400 PKR",
            "priceNum": 2400,
            "trustScore": 93,
            "manipulationRisk": "Low",
            "riskReason": "Official Copymate store"
          },
          {
            "name": "Local Shop (Saddar)",
            "url": "#",
            "price": "2,600 PKR",
            "priceNum": 2600,
            "trustScore": 88,
            "manipulationRisk": "Low",
            "riskReason": "Direct manufacturer distributor"
          }
        ],
        "advice": "Copymate official Daraz store se lein. Quality guaranteed!"
      }
    };

    const productLower = product.toLowerCase();
    
    // Check demo data
    for (const [key, data] of Object.entries(demoData)) {
      if (productLower.includes(key)) {
        return res.status(200).json(data);
      }
    }

    // If not in demo, return demo instructions
    return res.status(200).json({
      product: product,
      lowestPrice: "N/A",
      averagePrice: "N/A",
      sites: [],
      advice: "Demo mode: Search for 'A4 paper' or 'copymate' only. Add $5 credit on platform.claude.ai for live search of any product!"
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
};
