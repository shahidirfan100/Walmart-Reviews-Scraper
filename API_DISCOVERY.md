# API Discovery

## Selected API
- Endpoint: `https://www.walmart.com/reviews/product/{PRODUCT_ID}?entryPoint=viewAllReviewsBottom&sort={SORT}&page={PAGE}`
- Method: `GET`
- Auth: none
- Pagination: `page` query param
- Fields available:
  - Product: `product.name`, `product.canonicalUrl`, `product.sellerId`, `product.sellerName`, `product.brand`
  - Reviews summary: `averageOverallRating`, `totalReviewCount`, `filteredReviewsCount`, `pagination`, `recommendedPercentage`
  - Reviews list: `customerReviews[*]` with IDs, rating, title, text, timestamps, badges, feedback counts, media, user metadata
- Fields currently missing in old actor: all Walmart review fields above (old actor scraped Remote.co jobs)
- Field count: 40+ review/product fields (old actor had unrelated job fields)

## Why this API was selected
- This route consistently exposes structured JSON in the `__NEXT_DATA__` payload under:
  - `props.pageProps.initialData.data.reviews`
  - `props.pageProps.initialData.data.product`
- It supports stable pagination and sort controls directly in URL query params.
- It returns richer data than any fallback static metadata source.

## Candidate Comparison

### Candidate A (selected)
- `GET /reviews/product/{id}?entryPoint=viewAllReviewsBottom&sort=...&page=...`
- Score: **80/100**
  - Returns structured JSON data payload: +30
  - >15 fields available: +25
  - No auth required for page access: +20
  - Pagination via `page`: +15
  - Extends required fields: +10

### Candidate B
- `POST /orchestra/home/graphql` with persisted query `ReviewsById` and hash `b26c3733f6f3677bce6628bc3bc8e90df6c8bf7c016ee98d1625de0918c6e1ae`
- Rejected for runtime use: blocked by access controls (HTTP 418 / Access Denied) in direct server-to-server requests.

### Candidate C
- `/_next/data/{buildId}/reviews/product/{id}.json`
- Rejected: returned 404 for tested product routes.

## URLScan.io notes
- URLScan search API was reachable for lookup, but no relevant public scan existed for the target review URL.
- Public scan submission required API key in this environment, so discovery continued via live page/chunk analysis.

## Runtime approach decision
- Keep extraction API-based by using structured JSON payloads and avoid DOM selector scraping.
- No CSS selector extraction is used in the final actor.

## Runtime reliability and request contract
- Candidate A is a Walmart review page that contains structured data in `__NEXT_DATA__`; it is not a standalone JSON response. The actor must fetch the HTML and parse the embedded payload.
- The request URL remains `GET /reviews/product/{PRODUCT_ID}` with only the documented `entryPoint`, `sort`, and `page` query parameters. Pagination must continue to use the `page` parameter without skipping pages or lowering user limits.
- Direct server-to-server access can return HTTP 200 HTML titled `Robot or human?` without `__NEXT_DATA__`. This is a block response, not an empty review result or an extraction-schema change.
- The actor uses one shared Impit `ios18` client, a 30-second timeout, the endpoint-context `referer`, and one stable proxy identity for the run. Browser fingerprint headers are supplied by Impit rather than manually mixed into the request.
- A direct comparison against this route found generic `chrome` and generic `firefox` profiles returning the `Robot or human?` page, while `chrome151`, `firefox144`, `okhttp4`, and `ios18` returned HTTP 200 with `__NEXT_DATA__` and 10 reviews on pages 1–3. `ios18` was selected as the fastest successful profile in that comparison. This is evidence for the tested environment, not a guarantee against future Walmart controls.
- `okhttp4` and `ios18` are supported Impit mobile/app-style profiles, but they are used only because direct testing confirmed the same required web payload and pagination coverage. No undocumented mobile headers, tokens, or app endpoints are added.
- Apify Residential Proxy is the default in `input_schema.json` because the selected route is blocked from some direct-origin runs. Users can explicitly disable the proxy when their execution environment has verified direct access.
- Retry recovery is bounded and limited to robot-block responses, HTTP 408/425/429/5xx, timeouts, and transient network failures. Candidate B and Candidate C remain rejected; no speculative endpoint fallback is used.
