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
};  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController _ctrl = TextEditingController();
  bool _loading = false;
  String? _error;
  CompareResult? _result;

  Future<void> _search() async {
    final product = _ctrl.text.trim();
    if (product.isEmpty) return;

    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });

    try {
      final res = await http
          .post(
            Uri.parse(kBackendUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'product': product}),
          )
          .timeout(const Duration(seconds: 60));

      final json = jsonDecode(res.body) as Map<String, dynamic>;
      if (json.containsKey('error')) throw Exception(json['error']);

      setState(() {
        _result = CompareResult.fromJson(json);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error: ${e.toString()}';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F5),
      appBar: AppBar(
        title: Text('Price Checker PK',
            style: GoogleFonts.nunito(
                fontWeight: FontWeight.w700, color: Colors.white)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          Expanded(
            child: _loading
                ? _buildLoading()
                : _error != null
                    ? _buildError()
                    : _result != null
                        ? _buildResults()
                        : _buildEmptyState(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      color: const Color(0xFF1B5E20),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _ctrl,
              onSubmitted: (_) => _search(),
              style: GoogleFonts.nunito(fontSize: 15),
              decoration: InputDecoration(
                hintText: 'e.g. Copymate A4 paper rim 70 GSM',
                hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
              ),
            ),
          ),
          const SizedBox(width: 10),
          ElevatedButton(
            onPressed: _loading ? null : _search,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF43A047),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('Search',
                style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.compare_arrows_rounded,
                size: 72, color: Colors.green.shade200),
            const SizedBox(height: 20),
            Text('Product ka naam likhein',
                style: GoogleFonts.nunito(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade700)),
            const SizedBox(height: 8),
            Text(
              'Top websites ke rates compare karein aur genuine sellers dhundhein',
              textAlign: TextAlign.center,
              style: GoogleFonts.nunito(
                  fontSize: 14, color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: Color(0xFF1B5E20)),
          const SizedBox(height: 20),
          Text('Websites check ki ja rahi hain...',
              style:
                  GoogleFonts.nunito(fontSize: 15, color: Colors.grey.shade600)),
          const SizedBox(height: 6),
          Text('This may take 20-30 seconds',
              style:
                  GoogleFonts.nunito(fontSize: 13, color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 56, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text(_error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.nunito(
                    fontSize: 14, color: Colors.red.shade700)),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: _search,
              child: Text('Dobara try karein',
                  style: GoogleFonts.nunito()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResults() {
    final r = _result!;
    final minNum = r.sites
        .where((s) => s.priceNum > 0)
        .map((s) => s.priceNum)
        .fold<int>(999999999, (a, b) => a < b ? a : b);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Product title
        Text(r.product,
            style: GoogleFonts.nunito(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.grey.shade800)),
        const SizedBox(height: 12),

        // Summary cards
        Row(
          children: [
            _summaryCard('Sabse Sasta', r.lowestPrice, Colors.green.shade50,
                Colors.green.shade700, Icons.arrow_downward),
            const SizedBox(width: 10),
            _summaryCard('Average Price', r.averagePrice, Colors.blue.shade50,
                Colors.blue.shade700, Icons.bar_chart),
            const SizedBox(width: 10),
            _summaryCard('Sites', '${r.sites.length}', Colors.orange.shade50,
                Colors.orange.shade700, Icons.language),
          ],
        ),
        const SizedBox(height: 20),

        // Sites table
        Text('Website-wise Comparison',
            style: GoogleFonts.nunito(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Colors.grey.shade600,
                letterSpacing: 0.5)),
        const SizedBox(height: 10),

        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 12,
            headingRowColor: MaterialStateProperty.all(Colors.green.shade100),
            dataRowColor: MaterialStateProperty.resolveWith((states) {
              return Colors.grey.shade50;
            }),
            columns: [
              DataColumn(label: Text('Website', style: GoogleFonts.nunito(fontWeight: FontWeight.w700))),
              DataColumn(label: Text('Price', style: GoogleFonts.nunito(fontWeight: FontWeight.w700))),
              DataColumn(label: Text('Trust', style: GoogleFonts.nunito(fontWeight: FontWeight.w700))),
              DataColumn(label: Text('Risk', style: GoogleFonts.nunito(fontWeight: FontWeight.w700))),
            ],
            rows: r.sites.map((s) {
              final isBest = s.priceNum == minNum && minNum > 0;
              final riskColor = s.manipulationRisk == 'Low'
                  ? Colors.green
                  : s.manipulationRisk == 'Medium'
                      ? Colors.orange
                      : Colors.red;
              return DataRow(
                color: MaterialStateProperty.all(isBest ? Colors.green.shade100 : Colors.white),
                cells: [
                  DataCell(
                    GestureDetector(
                      onTap: () => launchUrl(Uri.parse(s.url), mode: LaunchMode.externalApplication),
                      child: Text(s.name, 
                        style: GoogleFonts.nunito(
                          fontSize: 12,
                          color: Colors.blue.shade600,
                          decoration: TextDecoration.underline,
                          fontWeight: isBest ? FontWeight.w700 : FontWeight.w500,
                        )),
                    ),
                  ),
                  DataCell(
                    Text(s.price,
                      style: GoogleFonts.nunito(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: isBest ? Colors.green.shade700 : Colors.black,
                      )),
                  ),
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade100,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text('${s.trustScore}/100',
                        style: GoogleFonts.nunito(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Colors.blue.shade700,
                        )),
                    ),
                  ),
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: riskColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(s.manipulationRisk,
                        style: GoogleFonts.nunito(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: riskColor,
                        )),
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 20),

        // Advice box
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.green.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.lightbulb_outline,
                      color: Colors.green.shade700, size: 18),
                  const SizedBox(width: 6),
                  Text('AI Recommendation',
                      style: GoogleFonts.nunito(
                          fontWeight: FontWeight.w700,
                          color: Colors.green.shade800,
                          fontSize: 14)),
                ],
              ),
              const SizedBox(height: 8),
              Text(r.advice,
                  style: GoogleFonts.nunito(
                      fontSize: 13,
                      color: Colors.green.shade900,
                      height: 1.5)),
            ],
          ),
        ),
        const SizedBox(height: 30),
      ],
    );
  }

  Widget _summaryCard(String label, String value, Color bg, Color fg, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: fg, size: 18),
            const SizedBox(height: 6),
            Text(value,
                style: GoogleFonts.nunito(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: fg)),
            Text(label,
                style: GoogleFonts.nunito(
                    fontSize: 10, color: fg.withOpacity(0.8))),
          ],
        ),
      ),
    );
  }


    }      messages: [{ role: "user", content: prompt }],
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
