# Price Compare Backend - API & Web Interface

This project provides a price comparison API for Pakistani e-commerce websites, powered by AI web search.

## Components

### 1. Backend API (`/api/compare.js`)
Node.js serverless function that:
- Accepts product search queries
- Uses Claude AI with web search capabilities
- Returns price comparisons from Pakistani e-commerce sites
- Includes trust scores and manipulation risk assessment

### 2. Web Frontend (`/public/index.html`)
Simple web interface that:
- Provides a user-friendly search interface
- Displays price comparison results
- **Includes Vercel Speed Insights for performance monitoring**

### 3. Flutter Mobile App (`/lib/main.dart`)
Mobile application that consumes the API (deployed separately)

## Vercel Speed Insights Integration

This project uses **@vercel/speed-insights** (v1.3.1) to monitor frontend performance.

### Implementation Details

Speed Insights is integrated in the web frontend using the ESM module import method:

```html
<script type="module">
  import { injectSpeedInsights } from 'https://esm.sh/@vercel/speed-insights';
  injectSpeedInsights();
</script>
```

This approach:
- ✅ Works without a build step
- ✅ Loads the latest version from ESM CDN
- ✅ Automatically tracks Core Web Vitals (LCP, FID, CLS, TTFB, INP)
- ✅ Sends metrics to Vercel dashboard

### Viewing Analytics

1. Deploy to Vercel
2. Navigate to your project dashboard
3. Click on "Speed Insights" tab
4. View performance metrics after users visit the site

## Local Development

```bash
# Install dependencies
npm install

# Run locally with Vercel CLI
npm run dev

# Deploy to Vercel
npm run deploy
```

## API Endpoint

**POST** `/api/compare`

Request:
```json
{
  "product": "Copymate A4 paper rim 70 GSM"
}
```

Response:
```json
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
  "advice": "buying recommendation"
}
```

## Environment Variables

Required in Vercel:
- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude AI

## Project Structure

```
.
├── api/
│   └── compare.js          # Serverless function API
├── public/
│   └── index.html          # Web frontend with Speed Insights
├── lib/
│   └── main.dart           # Flutter mobile app
├── package.json            # Node.js dependencies
├── pubspec.yaml           # Flutter dependencies
└── vercel.json            # Vercel configuration
```

## Technologies

- **Backend**: Node.js, Anthropic Claude AI
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Mobile**: Flutter/Dart
- **Analytics**: Vercel Speed Insights
- **Deployment**: Vercel Serverless Functions

## License

MIT
