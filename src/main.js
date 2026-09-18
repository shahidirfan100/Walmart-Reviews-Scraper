import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Actor, log } from 'apify';
import { Dataset } from 'crawlee';
import { Impit } from 'impit';

const SORT_OPTIONS = new Set([
    'relevancy',
    'helpful',
    'submission-desc',
    'submission-asc',
    'rating-desc',
    'rating-asc',
]);

const FETCH_RETRY_LIMIT = 4;
const MAX_CONSECUTIVE_FETCH_FAILURES = 6;
const PROGRESS_LOG_INTERVAL = 5;

await Actor.init();

const actorInput = (await Actor.getInput()) || {};
let input = actorInput;

function hasMeaningfulValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.some((item) => hasMeaningfulValue(item));
    if (typeof value === 'object') return Object.values(value).some((item) => hasMeaningfulValue(item));
    return true;
}

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const fallbackInputPaths = [
    path.resolve(process.cwd(), 'INPUT.json'),
    path.resolve(currentDir, '..', 'INPUT.json'),
];

const hasIdentifierInActorInput = [
    actorInput.productUrl,
    actorInput.productId,
    actorInput.startUrl,
    actorInput.url,
    actorInput.startUrls,
].some((value) => hasMeaningfulValue(value));

if (!hasIdentifierInActorInput) {
    try {
        const fallbackPath = fallbackInputPaths.find((candidatePath) => existsSync(candidatePath));
        if (fallbackPath) {
            input = JSON.parse(readFileSync(fallbackPath, 'utf8'));
            log.info(`No runtime input provided. Falling back to local INPUT.json at ${fallbackPath}.`);
        }
    } catch (error) {
        log.warning(`Failed to parse INPUT.json fallback: ${error.message}`);
    }
}

const {
    productUrl,
    productId,
    startUrl,
    url,
    startUrls,
    sort = 'relevancy',
    results_wanted = 20,
    max_pages = 10,
    proxyConfiguration: proxyConfig,
} = input;

function normalizeProxyConfiguration(inputProxyConfiguration) {
    if (!inputProxyConfiguration || typeof inputProxyConfiguration !== 'object') {
        return undefined;
    }

    const cleaned = { ...inputProxyConfiguration };
    const hasAnyConfig = Object.values(cleaned).some((value) => hasMeaningfulValue(value));
    return hasAnyConfig ? cleaned : undefined;
}

const normalizedProxyConfig = normalizeProxyConfiguration(proxyConfig);
const proxyConfiguration = normalizedProxyConfig
    ? await Actor.createProxyConfiguration(normalizedProxyConfig)
    : undefined;
let proxyUrl;

if (proxyConfiguration) {
    try {
        proxyUrl = await proxyConfiguration.newUrl();
    } catch (error) {
        log.warning(`Apify Proxy unavailable, falling back to direct requests: ${error.message}`);
    }
}

const httpClient = new Impit({
    browser: 'ios18',
    timeout: 30000,
    ...(proxyUrl && { proxyUrl }),
});

if (proxyUrl) {
    log.info('Using a stable configured proxy identity for Walmart requests.');
} else {
    log.warning('No proxy configured; Walmart may return a robot-check page.');
}

const resultsWanted = Math.max(1, Number.parseInt(String(results_wanted), 10) || 20);
const maxPages = Math.max(1, Number.parseInt(String(max_pages), 10) || 10);
const normalizedSort = SORT_OPTIONS.has(String(sort)) ? String(sort) : 'relevancy';

function toSingleStartUrl(startUrlsInput) {
    if (!Array.isArray(startUrlsInput) || startUrlsInput.length === 0) return undefined;
    const first = startUrlsInput[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && typeof first.url === 'string') return first.url;
    return undefined;
}

function extractProductId(value) {
    if (value === undefined || value === null) return undefined;

    const text = String(value).trim();
    if (!text) return undefined;

    if (/^\d{6,}$/.test(text)) return text;

    try {
        const parsed = new URL(text);
        const directParamCandidates = [
            parsed.searchParams.get('athcpid'),
            parsed.searchParams.get('item_id'),
            parsed.searchParams.get('itemId'),
            parsed.searchParams.get('id'),
            parsed.searchParams.get('productId'),
            parsed.searchParams.get('product_id'),
        ].filter(Boolean);
        for (const paramCandidate of directParamCandidates) {
            const paramId = extractProductId(paramCandidate);
            if (paramId) return paramId;
        }

        const reviewsMatch = parsed.pathname.match(/\/reviews\/product\/(\d{6,})/i);
        if (reviewsMatch?.[1]) return reviewsMatch[1];

        const ipMatch = parsed.pathname.match(/\/ip\/(?:.+\/)?(\d{6,})$/i);
        if (ipMatch?.[1]) return ipMatch[1];

        const fallbackPathMatch = parsed.pathname.match(/(\d{6,})/);
        if (fallbackPathMatch?.[1]) return fallbackPathMatch[1];
    } catch {
        // Not a URL, ignore.
    }

    const fallbackTextMatch = text.match(/(\d{6,})/);
    return fallbackTextMatch?.[1];
}

function resolveTarget() {
    const firstStartUrl = toSingleStartUrl(startUrls);

    const candidates = [
        productUrl,
        startUrl,
        url,
        firstStartUrl,
        productId,
    ];

    for (const candidate of candidates) {
        const id = extractProductId(candidate);
        if (id) {
            return {
                productId: id,
                productUrl: `https://www.walmart.com/reviews/product/${id}?entryPoint=viewAllReviewsBottom`,
            };
        }
    }

    throw new Error(
        'Missing product identifier. Provide productUrl, productId, startUrl, url, or startUrls containing a Walmart product URL/ID.',
    );
}

function extractNextData(html) {
    const marker = 'id="__NEXT_DATA__"';
    const markerIndex = html.indexOf(marker);
    if (markerIndex === -1) {
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch?.[1]?.trim() || 'Unknown page';
        throw new Error(`Walmart blocked or changed page format (missing __NEXT_DATA__, title: "${title}")`);
    }

    const startTagEnd = html.indexOf('>', markerIndex);
    const closeTag = html.indexOf('</script>', startTagEnd + 1);
    if (startTagEnd === -1 || closeTag === -1) {
        throw new Error('Malformed __NEXT_DATA__ script block.');
    }

    const jsonText = html.slice(startTagEnd + 1, closeTag);
    return JSON.parse(jsonText);
}

function compactValue(value) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || undefined;
    }
    if (Array.isArray(value)) {
        const compactedArray = value
            .map((item) => compactValue(item))
            .filter((item) => item !== undefined);
        return compactedArray.length ? compactedArray : undefined;
    }
    if (typeof value === 'object') {
        const compactedObject = {};
        for (const [key, val] of Object.entries(value)) {
            const compacted = compactValue(val);
            if (compacted !== undefined) compactedObject[key] = compacted;
        }
        return Object.keys(compactedObject).length ? compactedObject : undefined;
    }
    return value;
}

function toAbsoluteReviewUrl(productIdToUse, page, sortValue) {
    const urlObject = new URL(`https://www.walmart.com/reviews/product/${productIdToUse}`);
    urlObject.searchParams.set('entryPoint', 'viewAllReviewsBottom');
    urlObject.searchParams.set('sort', sortValue);
    urlObject.searchParams.set('page', String(page));
    return urlObject.toString();
}

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function buildRequestHeaders(targetUrl) {
    const { origin } = new URL(targetUrl);

    return {
        referer: `${origin}/`,
    };
}

function isRobotBlockError(error) {
    const statusCode = Number(error?.statusCode);
    const message = String(error?.message || '');
    return (
        [403, 418].includes(statusCode) ||
        message.includes('Robot or human?') ||
        message.includes('missing __NEXT_DATA__')
    );
}

function isRetryableError(error) {
    const statusCode = Number(error?.statusCode);
    if ([408, 425, 429].includes(statusCode) || statusCode >= 500) return true;
    if (isRobotBlockError(error)) return true;

    const code = String(error?.code || '');
    const message = String(error?.message || '');
    return (
        ['ABORT_ERR', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ETIMEDOUT'].includes(code) ||
        /(?:timed out|timeout|network|fetch failed|connection (?:reset|closed|refused)|temporary failure)/i.test(
            message,
        )
    );
}

function getRetryAfterMs(response) {
    const retryAfter = response.headers?.get?.('retry-after');
    if (!retryAfter) return undefined;

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(seconds * 1000, 15000);
    }

    const retryAt = Date.parse(retryAfter);
    if (!Number.isNaN(retryAt)) {
        return Math.min(Math.max(retryAt - Date.now(), 0), 15000);
    }

    return undefined;
}

function mapReview(review, baseRecord) {
    const cleanUrl = (rawUrl) => {
        if (!rawUrl || typeof rawUrl !== 'string') return undefined;
        try {
            const parsed = new URL(rawUrl.trim());
            parsed.search = '';
            parsed.hash = '';
            return parsed.toString();
        } catch {
            return undefined;
        }
    };

    const mediaUrls = Array.isArray(review.media)
        ? [...new Set(
            review.media
                .map((mediaItem) => cleanUrl(mediaItem?.normalUrl || mediaItem?.thumbnailUrl))
                .filter(Boolean),
        )]
        : undefined;

    const record = {
        ...baseRecord,
        reviewId: review.reviewId,
        reviewReferenceId: review.reviewReferenceId,
        reviewTitle: review.reviewTitle,
        reviewText: review.reviewText,
        rating: review.rating,
        recommended: review.recommended,
        reviewSubmissionTime: review.reviewSubmissionTime,
        authorId: review.authorId,
        userNickname: review.userNickname,
        userLocation: review.userLocation,
        fulfilledBy: review.fulfilledBy,
        sellerName: review.sellerName,
        itemId: review.itemId,
        positiveFeedback: review.positiveFeedback,
        negativeFeedback: review.negativeFeedback,
        badges: review.badges,
        userBadges: review.userBadges,
        mediaUrls,
        hasMedia: Array.isArray(review.media) ? review.media.length > 0 : false,
        originalLanguage: review.originalLanguage,
        translatedLanguage: review.translatedLanguage,
    };

    return compactValue(record);
}

async function fetchReviewPage(targetUrl) {
    let lastError;

    for (let attempt = 1; attempt <= FETCH_RETRY_LIMIT; attempt++) {
        try {
            const response = await httpClient.fetch(targetUrl, {
                headers: buildRequestHeaders(targetUrl),
            });

            if (!response.ok) {
                const requestError = new Error(`HTTP ${response.status} for ${targetUrl}`);
                requestError.statusCode = response.status;
                requestError.retryAfterMs = getRetryAfterMs(response);
                throw requestError;
            }

            const html = await response.text();
            return {
                ok: true,
                nextData: extractNextData(html),
                blocked: false,
            };
        } catch (error) {
            lastError = error;
            const blocked = isRobotBlockError(error);
            const retryable = isRetryableError(error);
            const logMessage = `Attempt ${attempt}/${FETCH_RETRY_LIMIT} failed for ${targetUrl}: ${error.message}`;
            log.debug(logMessage);

            if (!retryable || attempt === FETCH_RETRY_LIMIT) break;

            const backoffMs =
                error.retryAfterMs ??
                (blocked
                    ? 900 * attempt + Math.floor(Math.random() * 700)
                    : 600 * attempt + Math.floor(Math.random() * 400));
            await wait(backoffMs);
        }
    }

    return {
        ok: false,
        nextData: undefined,
        blocked: isRobotBlockError(lastError),
        error: lastError,
    };
}

const target = resolveTarget();
log.info(`Target product ID: ${target.productId}`);

const seenReviewIds = new Set();
let totalPushed = 0;
let blockedPages = 0;
let skippedPages = 0;
let consecutiveFetchFailures = 0;
let processedPages = 0;
let stopReason = 'max_pages_reached';

for (let page = 1; page <= maxPages; page++) {
    if (totalPushed >= resultsWanted) break;

    const pageUrl = toAbsoluteReviewUrl(target.productId, page, normalizedSort);
    if (page === 1 || page % PROGRESS_LOG_INTERVAL === 0) {
        log.info(`Processing page ${page}/${maxPages}. Collected ${totalPushed}/${resultsWanted} reviews.`);
    } else {
        log.debug(`Fetching page ${page}/${maxPages}: ${pageUrl}`);
    }

    const pageResult = await fetchReviewPage(pageUrl);
    if (!pageResult.ok) {
        skippedPages += 1;
        consecutiveFetchFailures += 1;
        if (pageResult.blocked) blockedPages += 1;

        log.warning(
            `Skipping page ${page} after retries (${pageResult.error?.message || 'unknown error'}).`,
        );

        if (consecutiveFetchFailures >= MAX_CONSECUTIVE_FETCH_FAILURES) {
            stopReason = `consecutive_failures_${MAX_CONSECUTIVE_FETCH_FAILURES}`;
            log.warning(
                `Stopping early after ${consecutiveFetchFailures} consecutive failed pages to avoid actor crash.`,
            );
            break;
        }

        continue;
    }

    consecutiveFetchFailures = 0;
    processedPages += 1;

    const { nextData } = pageResult;
    const payload = nextData?.props?.pageProps?.initialData?.data;

    const reviewsRoot = payload?.reviews;
    const product = payload?.product;
    const customerReviews = Array.isArray(reviewsRoot?.customerReviews)
        ? reviewsRoot.customerReviews
        : [];

    if (customerReviews.length === 0) {
        log.info(`No reviews found on page ${page}; stopping pagination.`);
        stopReason = 'no_reviews_page';
        break;
    }

    const baseRecord = compactValue({
        productId: target.productId,
        productUrl: target.productUrl,
        canonicalProductUrl: product?.canonicalUrl,
        productName: product?.name,
        brand: product?.brand,
        sellerId: product?.sellerId,
        sellerName: product?.sellerName,
        averageOverallRating: reviewsRoot?.averageOverallRating,
        roundedAverageOverallRating: reviewsRoot?.roundedAverageOverallRating,
        totalReviewCount: reviewsRoot?.totalReviewCount,
        filteredReviewsCount: reviewsRoot?.filteredReviewsCount,
        recommendationPercentage: reviewsRoot?.recommendedPercentage,
        totalMediaCount: reviewsRoot?.totalMediaCount,
        activeSort: reviewsRoot?.activeSort,
        currentPage: page,
    });

    const pageBatch = [];

    for (const review of customerReviews) {
        const reviewId = review?.reviewId;
        if (!reviewId || seenReviewIds.has(String(reviewId))) continue;

        const mapped = mapReview(review, baseRecord);
        if (!mapped) continue;

        seenReviewIds.add(String(reviewId));
        pageBatch.push(mapped);

        if (totalPushed + pageBatch.length >= resultsWanted) break;
    }

    if (pageBatch.length === 0) {
        log.info(`Page ${page} had only duplicates/empty records; continuing.`);
        continue;
    }

    await Dataset.pushData(pageBatch);
    totalPushed += pageBatch.length;

    const totalAvailable = Number.parseInt(String(reviewsRoot?.filteredReviewsCount || 0), 10);
    log.debug(`Saved ${pageBatch.length} reviews from page ${page}. Total: ${totalPushed}/${resultsWanted}.`);

    if (Number.isFinite(totalAvailable) && totalAvailable > 0 && totalPushed >= totalAvailable) {
        log.info('Reached available review count. Stopping.');
        stopReason = 'available_reviews_reached';
        break;
    }
}

if (totalPushed >= resultsWanted) {
    stopReason = 'results_wanted_reached';
}

log.info(
    `Done. Saved ${totalPushed} reviews. Pages processed: ${processedPages}. `
    + `Pages skipped: ${skippedPages} (blocked: ${blockedPages}). Stop reason: ${stopReason}.`,
);

await Actor.exit();
