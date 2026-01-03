import axios from "axios";

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source: "general" | "shopee";
  isShopee: boolean;
}

export type SearchType = "all" | "shopee" | "general";

/**
 * Perform a Google search for the given NCC serial number.
 * Uses Google Custom Search API if configured, otherwise falls back to a simple scraping approach.
 */
export async function performGoogleSearch(
  serialNumber: string,
  searchType: SearchType = "all"
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  if (searchType === "all" || searchType === "shopee") {
    // Shopee-specific search
    const shopeeResults = await performSearch(serialNumber, "shopee");
    results.push(...shopeeResults);
  }

  if (searchType === "all" || searchType === "general") {
    // General search (excluding Shopee to avoid duplicates)
    const generalResults = await performSearch(serialNumber, "general");
    // Filter out Shopee results from general search to avoid duplicates
    const filteredGeneral = generalResults.filter(
      (r) => !r.url.includes("shopee.tw") && !r.url.includes("shopee.com")
    );
    results.push(...filteredGeneral);
  }

  return results;
}

/**
 * Perform Shopee-specific search
 */
export async function performShopeeSearch(serialNumber: string): Promise<SearchResult[]> {
  return performSearch(serialNumber, "shopee");
}

async function performSearch(
  serialNumber: string,
  source: "general" | "shopee"
): Promise<SearchResult[]> {
  // Build query based on source
  let query: string;
  if (source === "shopee") {
    // Search specifically on Shopee Taiwan
    query = `site:shopee.tw "${serialNumber}"`;
  } else {
    query = `"${serialNumber}"`;
  }

  // Try Google Custom Search API first
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  let rawResults: Omit<SearchResult, "source" | "isShopee">[];

  if (apiKey && searchEngineId) {
    rawResults = await performGoogleCustomSearch(query, apiKey, searchEngineId);
  } else {
    rawResults = await performFallbackSearch(query);
  }

  // Add source and isShopee flag to results
  return rawResults.map((r) => ({
    ...r,
    source,
    isShopee: r.url.includes("shopee.tw") || r.url.includes("shopee.com"),
  }));
}

async function performGoogleCustomSearch(
  query: string,
  apiKey: string,
  searchEngineId: string
): Promise<Omit<SearchResult, "source" | "isShopee">[]> {
  try {
    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: 10,
      },
    });

    const items = response.data.items || [];
    return items.map((item: { link: string; title: string; snippet: string }) => ({
      url: item.link,
      title: item.title || "",
      snippet: item.snippet || "",
    }));
  } catch (error) {
    console.error("[Search] Google Custom Search API error:", error);
    return [];
  }
}

async function performFallbackSearch(
  query: string
): Promise<Omit<SearchResult, "source" | "isShopee">[]> {
  // Use DuckDuckGo HTML search as fallback (more permissive than Google)
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      timeout: 10000,
    });

    const html = response.data as string;
    const results: Omit<SearchResult, "source" | "isShopee">[] = [];

    // Parse DuckDuckGo HTML results
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g;

    let match;
    const urls: string[] = [];
    const titles: string[] = [];
    const snippets: string[] = [];

    while ((match = resultRegex.exec(html)) !== null) {
      // DuckDuckGo wraps URLs in a redirect, extract the actual URL
      const urlParam = match[1];
      const actualUrl = extractActualUrl(urlParam);
      if (actualUrl) {
        urls.push(actualUrl);
        titles.push(decodeHtmlEntities(match[2]));
      }
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(decodeHtmlEntities(match[1]));
    }

    for (let i = 0; i < urls.length && i < 10; i++) {
      results.push({
        url: urls[i],
        title: titles[i] || "",
        snippet: snippets[i] || "",
      });
    }

    return results;
  } catch (error) {
    console.error("[Search] Fallback search error:", error);
    return [];
  }
}

function extractActualUrl(duckduckgoUrl: string): string | null {
  try {
    // DuckDuckGo uses uddg parameter for the actual URL
    if (duckduckgoUrl.includes("uddg=")) {
      const match = duckduckgoUrl.match(/uddg=([^&]*)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    // If it's already a direct URL
    if (duckduckgoUrl.startsWith("http")) {
      return duckduckgoUrl;
    }
    return null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Check if a URL is from Shopee
 */
export function isShopeeUrl(url: string): boolean {
  return url.includes("shopee.tw") || url.includes("shopee.com");
}

/**
 * Extract seller information from Shopee URL if possible
 */
export function extractShopeeSellerInfo(url: string): {
  shopId?: string;
  productId?: string;
  shopName?: string;
} | null {
  try {
    const urlObj = new URL(url);

    // Shopee product URL format: https://shopee.tw/product-name-i.{shopId}.{productId}
    const productMatch = url.match(/i\.(\d+)\.(\d+)/);
    if (productMatch) {
      return {
        shopId: productMatch[1],
        productId: productMatch[2],
      };
    }

    // Shopee shop URL format: https://shopee.tw/{shopName}
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    if (pathParts.length === 1 && !pathParts[0].includes("-i.")) {
      return {
        shopName: pathParts[0],
      };
    }

    return null;
  } catch {
    return null;
  }
}
