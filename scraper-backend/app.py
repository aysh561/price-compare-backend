import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time

app = Flask(__name__)
CORS(app)

# Website trust scores and selectors
SITE_CONFIG = {
    "daraz.pk": {"trust": 92, "price_selector": ".ooOhoO", "name": "Daraz"},
    "olx.com.pk": {"trust": 75, "price_selector": ".fontHeading", "name": "OLX"},
    "goto.com.pk": {"trust": 85, "price_selector": ".price", "name": "Goto"},
    "amazon.com": {"trust": 95, "price_selector": ".a-price-whole", "name": "Amazon"},
    "aliexpress.com": {"trust": 70, "price_selector": ".search-card-price-main", "name": "AliExpress"},
    "symbios.com.pk": {"trust": 88, "price_selector": ".price", "name": "Symbios"},
    "ishopping.pk": {"trust": 83, "price_selector": ".product-price", "name": "iShopping"},
}

def get_trust_score(url):
    """Get trust score based on domain"""
    for domain, config in SITE_CONFIG.items():
        if domain in url.lower():
            return config["trust"]
    return 60  # Default trust score

def extract_price(url):
    """Extract price from product page"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=5)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try to find price with multiple strategies
        price_text = None
        
        # Strategy 1: Look for common price patterns
        price_patterns = [
            soup.find_all(class_=lambda x: x and 'price' in x.lower()),
            soup.find_all(['span', 'div'], {'data-price': True}),
        ]
        
        for elements in price_patterns:
            for elem in elements[:3]:
                text = elem.get_text(strip=True)
                if any(c.isdigit() for c in text) and len(text) < 50:
                    price_text = text
                    break
            if price_text:
                break
        
        # Extract numbers only
        if price_text:
            numbers = ''.join(filter(lambda x: x.isdigit() or x == ',', price_text))
            if numbers:
                return numbers
        
        return "N/A"
    except:
        return "N/A"

def search_google(product):
    """Search Google for product - returns top 5 links"""
    try:
        # Using a simple approach with requests
        search_url = f"https://www.google.com/search?q={product}+price+pakistan+site:daraz.pk+OR+site:olx.com.pk+OR+site:goto.com.pk"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(search_url, headers=headers, timeout=5)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        results = []
        for g in soup.find_all('div', class_='g')[:10]:
            try:
                link_elem = g.find('a', href=True)
                if not link_elem:
                    continue
                
                link = link_elem['href']
                if '/url?q=' in link:
                    link = link.split('/url?q=')[1].split('&')[0]
                
                # Filter valid product links
                if any(domain in link.lower() for domain in SITE_CONFIG.keys()):
                    title = g.find('h3')
                    title_text = title.get_text() if title else "Product"
                    
                    results.append({
                        'title': title_text,
                        'url': link,
                    })
                    
                    if len(results) >= 5:
                        break
            except:
                continue
        
        return results
    except:
        return []

@app.route('/api/search', methods=['POST'])
def search():
    try:
        data = request.json
        product = data.get('product', '').strip()
        
        if not product:
            return jsonify({'error': 'Product name required'}), 400
        
        # Search for top results
        search_results = search_google(product)
        
        if not search_results:
            return jsonify({
                'product': product,
                'sites': [],
                'advice': 'No results found. Try a different product name.'
            }), 200
        
        # Extract prices from each link
        sites = []
        for idx, result in enumerate(search_results[:5]):
            try:
                price = extract_price(result['url'])
                trust = get_trust_score(result['url'])
                
                # Determine manipulation risk
                if trust >= 85:
                    risk = "Low"
                elif trust >= 70:
                    risk = "Medium"
                else:
                    risk = "High"
                
                sites.append({
                    'name': result['title'][:50],
                    'url': result['url'],
                    'price': price,
                    'priceNum': int(''.join(filter(str.isdigit, price.split(',')[0]))) if price != "N/A" else 0,
                    'trustScore': trust,
                    'manipulationRisk': risk,
                    'riskReason': 'Trusted Pakistani marketplace' if trust >= 80 else 'Verify seller carefully'
                })
                time.sleep(0.5)  # Be respectful to servers
            except:
                continue
        
        # Sort by price
        sites_sorted = sorted(sites, key=lambda x: x['priceNum'] if x['priceNum'] > 0 else 999999)
        
        avg_price = sum(s['priceNum'] for s in sites_sorted if s['priceNum'] > 0) / max(len([s for s in sites_sorted if s['priceNum'] > 0]), 1)
        
        return jsonify({
            'product': product,
            'lowestPrice': f"{sites_sorted[0]['price']} PKR" if sites_sorted else "N/A",
            'averagePrice': f"{int(avg_price)} PKR" if avg_price > 0 else "N/A",
            'sites': sites_sorted[:5],
            'advice': f'Compare prices carefully. Top result: {sites_sorted[0]["name"] if sites_sorted else "No results"}'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False)
