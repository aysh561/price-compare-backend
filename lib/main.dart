import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

// =====================================================================
// IMPORTANT: Yahan apna Vercel URL daalein deploy karne ke baad
// =====================================================================
const String kBackendUrl = 'https://YOUR-PROJECT.vercel.app/api/compare';

void main() {
  runApp(const PriceCompareApp());
}

// ─── Models ───────────────────────────────────────────────────────────

class SiteResult {
  final String name;
  final String url;
  final String price;
  final int priceNum;
  final int trustScore;
  final String manipulationRisk;
  final String riskReason;

  SiteResult({
    required this.name,
    required this.url,
    required this.price,
    required this.priceNum,
    required this.trustScore,
    required this.manipulationRisk,
    required this.riskReason,
  });

  factory SiteResult.fromJson(Map<String, dynamic> j) => SiteResult(
        name: j['name'] ?? '',
        url: j['url'] ?? '',
        price: j['price'] ?? 'N/A',
        priceNum: (j['priceNum'] ?? 0).toInt(),
        trustScore: (j['trustScore'] ?? 0).toInt(),
        manipulationRisk: j['manipulationRisk'] ?? 'Unknown',
        riskReason: j['riskReason'] ?? '',
      );
}

class CompareResult {
  final String product;
  final String lowestPrice;
  final String averagePrice;
  final List<SiteResult> sites;
  final String advice;

  CompareResult({
    required this.product,
    required this.lowestPrice,
    required this.averagePrice,
    required this.sites,
    required this.advice,
  });

  factory CompareResult.fromJson(Map<String, dynamic> j) => CompareResult(
        product: j['product'] ?? '',
        lowestPrice: j['lowestPrice'] ?? 'N/A',
        averagePrice: j['averagePrice'] ?? 'N/A',
        sites: (j['sites'] as List<dynamic>? ?? [])
            .map((s) => SiteResult.fromJson(s))
            .toList(),
        advice: j['advice'] ?? '',
      );
}

// ─── App Root ─────────────────────────────────────────────────────────

class PriceCompareApp extends StatelessWidget {
  const PriceCompareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Price Checker PK',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1B5E20),
          brightness: Brightness.light,
        ),
        textTheme: GoogleFonts.nunitoTextTheme(),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1B5E20),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: const HomePage(),
    );
  }
}

// ─── Home Page ────────────────────────────────────────────────────────

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
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


}
