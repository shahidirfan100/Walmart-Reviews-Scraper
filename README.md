## What does Walmart Reviews Scraper do?

Extract structured customer reviews from Walmart product pages using a product URL or product ID. Collect star ratings, review text, reviewer metadata, product-level summary signals, and media links in a clean dataset ready for market research, sentiment analysis, and competitive monitoring.

## Why use Walmart Reviews Scraper?

- **Reliable dataset creation** - Collect Walmart review data without manual copy-paste or page-by-page browsing.
- **Configurable sorting** - Pull most relevant, most helpful, newest, oldest, highest-rated, or lowest-rated reviews.
- **Automation-ready output** - Export results to JSON, CSV, Excel, or XML, and connect them to downstream workflows.
- **Use-case fit** - Supports product research, reputation monitoring, merchandising insights, and BI data pipelines.

## What data can you extract from Walmart?

| Field | Description |
|-------|-------------|
| `productId` | Walmart product identifier |
| `productName` | Product title |
| `reviewId` | Unique review identifier |
| `reviewTitle` | Review headline |
| `reviewText` | Full review content |
| `rating` | Star rating value |
| `recommended` | Whether the reviewer recommends the product |
| `reviewSubmissionTime` | Submission date from source |
| `userNickname` | Reviewer display name |
| `userLocation` | Reviewer location |
| `positiveFeedback` | Helpful vote count |
| `negativeFeedback` | Unhelpful vote count |
| `mediaUrls` | Review image and media URLs |

## How to use Walmart Reviews Scraper

1. Open the Actor on Apify Store.
2. Add a Walmart product URL, review URL, or numeric product ID.
3. Set the result limit, sort order, and optional proxy settings.
4. Run the Actor.
5. Download the dataset or connect it to your workflow.

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `productUrl` | String | No | Prefilled example URL | Walmart product or review URL to collect reviews from |
| `productId` | String | No | Prefilled example ID | Numeric Walmart product ID; used when URL is not provided |
| `sort` | String | No | `relevancy` | Review sort order: `relevancy`, `helpful`, `submission-desc`, `submission-asc`, `rating-desc`, `rating-asc` |
| `results_wanted` | Integer | No | `20` | Maximum number of reviews to collect |
| `max_pages` | Integer | No | `10` | Maximum number of review pages to fetch |
| `proxyConfiguration` | Object | No | Not set | Proxy settings for stability; enable Apify Proxy for anti-blocking |

## Output Data

| Field | Type | Description |
|-------|------|-------------|
| `productId` | String | Walmart product ID |
| `productName` | String | Product title |
| `productUrl` | String | Walmart review page URL |
| `canonicalProductUrl` | String | Canonical Walmart product URL when available |
| `reviewId` | String | Unique review identifier |
| `reviewReferenceId` | String | Review reference token |
| `reviewTitle` | String | Review headline |
| `reviewText` | String | Full review text |
| `rating` | Number | Star rating value |
| `recommended` | Boolean | Whether the reviewer recommends the product |
| `reviewSubmissionTime` | String | Submission date from source |
| `userNickname` | String | Reviewer display name when available |
| `userLocation` | String | Reviewer location |
| `positiveFeedback` | Number | Helpful vote count |
| `negativeFeedback` | Number | Unhelpful vote count |
| `mediaUrls` | Array | Review image and media URLs |
| `averageOverallRating` | Number | Product average rating |
| `totalReviewCount` | Number | Total review count for the product |
| `filteredReviewsCount` | Number | Filtered review count under current view |
| `currentPage` | Number | Source page number for the review |

## Usage Examples

### Basic Run With Product URL

Collect the first batch of reviews from a Walmart product:

```json
{
  "productUrl": "https://www.walmart.com/reviews/product/18023573301?entryPoint=viewAllReviewsBottom",
  "results_wanted": 20
}
```

### Run With Product ID

Use a numeric product ID instead of a URL:

```json
{
  "productId": "18023573301",
  "results_wanted": 50,
  "max_pages": 10
}
```

### Sorted Reviews With Proxy

Collect highest-rated reviews with residential proxy for stability:

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

## Tips for Best Results

- Start with `results_wanted: 20` to validate your input before scaling up.
- Prefer direct review URLs or numeric product IDs for the most reliable input.
- Increase `max_pages` only when you need more review depth.
- Enable Apify Proxy with residential groups for larger or scheduled runs.

## Integrations

- **Google Sheets** - Share review datasets with non-technical teams.
- **Airtable** - Build searchable feedback repositories.
- **Make** - Trigger automations from new review runs.
- **Zapier** - Route review data to downstream apps.
- **Webhooks** - Push results into custom services.

Export formats: JSON, CSV, Excel, XML.

## Frequently Asked Questions

### Can I scrape by product ID only?

Yes. Provide `productId` and the Actor resolves the review page automatically.

### Does this support pagination?

Yes. The Actor paginates review pages up to `max_pages` and stops early when `results_wanted` is reached.

### Can I control review order?

Yes. Use `sort` to choose relevancy, helpfulness, recency, or rating-based ordering.

### Why are some fields missing in some reviews?

Not all reviewers provide every field (for example location or media), so only available values are saved.

### Can I run this on multiple products?

Run the Actor separately per product input for clean, product-specific datasets.

### Is it legal to scrape Walmart reviews?

Scraping public web data can be legal, but you are responsible for complying with applicable laws, website terms, and privacy rules.

## Related Actors

- [Target Reviews Scraper](https://apify.com/shahidirfan/target-reviews-scraper) - Collect customer reviews from Target product pages.
- [Walmart Product Scraper](https://apify.com/shahidirfan/walmart-product-scraper) - Extract Walmart product listings, pricing, and availability.

## Support

For issues, feature requests, or custom Actor work, use the Issues tab on the Actor page or contact the developer through Apify.

## Legal Notice

This Actor is designed for legitimate data collection from publicly available sources. Users are responsible for using the data responsibly and complying with applicable laws and website terms.
