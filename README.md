# Walmart Reviews Scraper

Extract structured customer reviews from Walmart product review pages using a product URL or product ID. Collect ratings, review text, reviewer metadata, and product-level summary signals in a clean dataset ready for analysis, monitoring, and reporting.

## Features

- **Flexible input** - Start with a Walmart review URL, product URL, product ID, or other URL fields (`startUrl`, `url`, `startUrls`).
- **Paginated collection** - Automatically walks review pages until your limits are reached.
- **Configurable sorting** - Pull most relevant, most helpful, newest, oldest, highest-rated, or lowest-rated reviews.
- **Clean dataset output** - Removes empty values and keeps records consistent for downstream use.
- **Production-oriented limits** - Control both `results_wanted` and `max_pages` for reliable run time.

## Use Cases

### Product Research
Review real customer feedback before sourcing products or launching campaigns. Spot recurring praise and complaints quickly.

### Reputation Monitoring
Track how customer sentiment changes over time for your own catalog or competitor products.

### Merchandising Insights
Identify feature-level pain points and strengths from review text and star ratings.

### Data Pipelines
Export review datasets to BI tools, warehouses, or spreadsheets for ongoing analysis.

---

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `productUrl` | String | No | `https://www.walmart.com/reviews/product/18023573301?entryPoint=viewAllReviewsBottom` | Walmart product/review URL. |
| `productId` | String | No | `18023573301` | Numeric Walmart product ID. |
| `sort` | String | No | `relevancy` | Review order: `relevancy`, `helpful`, `submission-desc`, `submission-asc`, `rating-desc`, `rating-asc`. |
| `results_wanted` | Integer | No | `20` | Maximum number of reviews to collect. |
| `max_pages` | Integer | No | `10` | Maximum number of review pages to fetch. |
| `proxyConfiguration` | Object | No | Not set | Optional proxy options for reliability. Enable Apify Proxy when you need more anti-blocking stability. |

---

## Output Data

Each dataset item includes product-level and review-level fields.

| Field | Type | Description |
|-------|------|-------------|
| `productId` | String | Walmart product ID. |
| `productName` | String | Product title. |
| `productUrl` | String | Walmart review page URL. |
| `canonicalProductUrl` | String | Canonical Walmart product URL when available. |
| `reviewId` | String | Unique review identifier. |
| `reviewReferenceId` | String | Review reference token. |
| `reviewTitle` | String | Review headline. |
| `reviewText` | String | Full review text. |
| `rating` | Number | Star rating value. |
| `recommended` | Boolean | Whether reviewer recommends the product. |
| `reviewSubmissionTime` | String | Submission date string from source. |
| `userNickname` | String | Reviewer display name when available. |
| `userLocation` | String | Reviewer location. |
| `positiveFeedback` | Number | Helpful/upvote count. |
| `negativeFeedback` | Number | Unhelpful/downvote count. |
| `mediaUrls` | Array | List of review image/media URLs. |
| `averageOverallRating` | Number | Product average rating. |
| `totalReviewCount` | Number | Total review count for product. |
| `filteredReviewsCount` | Number | Filtered review count under current view. |
| `currentPage` | Number | Source page number for the review item. |

---

## Usage Examples

### Basic Run With Product URL

```json
{
  "productUrl": "https://www.walmart.com/reviews/product/18023573301?entryPoint=viewAllReviewsBottom",
  "results_wanted": 20
}
```

### Run With Product ID

```json
{
  "productId": "18023573301",
  "results_wanted": 50,
  "max_pages": 10
}
```

### Sorted Reviews With Proxy

```json
{
  "productUrl": "https://www.walmart.com/reviews/product/18023573301?entryPoint=viewAllReviewsBottom",
  "sort": "rating-desc",
  "results_wanted": 100,
  "max_pages": 20,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

---

## Sample Output

```json
{
  "productId": "18023573301",
  "productName": "Free Assembly Women's and Women's Plus Sleeveless Belted Cotton Midi Dress, Sizes XS-4X",
  "productUrl": "https://www.walmart.com/reviews/product/18023573301?entryPoint=viewAllReviewsBottom",
  "reviewId": "417671463",
  "reviewReferenceId": "9c6dc3b4-a217-5833-91db-ba1e422e0a1a",
  "reviewTitle": "Beautiful 100% cotton dress",
  "reviewText": "This dress is 100% cotton...",
  "rating": 5,
  "recommended": true,
  "reviewSubmissionTime": "2/25/2026",
  "userLocation": "Florida",
  "positiveFeedback": 12,
  "negativeFeedback": 1,
  "mediaUrls": [
    "https://i5.walmartimages.com/dfw/...jpg"
  ],
  "averageOverallRating": 4.3,
  "totalReviewCount": 355,
  "filteredReviewsCount": 51,
  "currentPage": 1
}
```

---

## Tips For Best Results

### Start Small First
- Begin with `results_wanted: 20` to validate your input quickly.
- Increase limits after confirming output quality.

### Use Reliable Inputs
- Prefer direct review URLs or numeric product IDs.
- If using URL inputs, include a Walmart product/review URL with any query tags.

### Tune Pagination
- Increase `max_pages` only when needed.
- Keep `results_wanted` aligned with your analysis scope.

### Use Proxy For Stability
- Keep `useApifyProxy: true` for automatic Apify proxy rotation.
- For strict targets, set `apifyProxyGroups` to `["RESIDENTIAL"]`.

---

## Integrations

Connect your dataset with:

- **Google Sheets** - Share review datasets with non-technical teams.
- **Airtable** - Build searchable feedback repositories.
- **Make** - Trigger automations from new review runs.
- **Zapier** - Route review data to downstream apps.
- **Webhooks** - Push results into custom services.

### Export Formats

- **JSON** - API and engineering workflows.
- **CSV** - Spreadsheet workflows.
- **Excel** - Business reporting.
- **XML** - Legacy integrations.

---

## Frequently Asked Questions

### Can I scrape by product ID only?
Yes. Provide `productId` and the actor will resolve the review page automatically.

### Does this support pagination?
Yes. The actor paginates review pages up to `max_pages` and stops early when `results_wanted` is reached.

### Can I control review order?
Yes. Use `sort` to choose relevancy, helpfulness, recency, or rating-based ordering.

### Why are some fields missing in some reviews?
Not all reviewers provide every field (for example location or media), so only available values are saved.

### Can I run this on multiple products?
Run the actor separately per product input for clean, product-specific datasets.

---

## Support

For issues or feature requests, contact support through the Apify Console.

### Resources

- [Apify Documentation](https://docs.apify.com/)
- [Apify API Reference](https://docs.apify.com/api/v2)
- [Scheduling Runs](https://docs.apify.com/schedules)

---

## Legal Notice

This actor is designed for legitimate data collection purposes. Users are responsible for ensuring compliance with website terms of service and applicable laws, and for using collected data responsibly.
