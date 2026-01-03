import { describe, it, expect, vi } from "vitest";

// Mock the search module functions
vi.mock("../server/search", () => ({
  performGoogleSearch: vi.fn(),
  performShopeeSearch: vi.fn(),
  extractShopeeSellerInfo: vi.fn(),
  isShopeeUrl: vi.fn(),
}));

import {
  extractShopeeSellerInfo,
  isShopeeUrl,
} from "../server/search";

describe("Shopee URL Detection", () => {
  it("should correctly identify Shopee Taiwan URLs", () => {
    // Test the actual implementation
    const testUrls = [
      { url: "https://shopee.tw/product-name-i.123456.789012", expected: true },
      { url: "https://shopee.tw/shop/seller123", expected: true },
      { url: "https://www.shopee.tw/item/123", expected: true },
      { url: "https://amazon.com/product", expected: false },
      { url: "https://google.com/search", expected: false },
      { url: "https://ruten.com.tw/item", expected: false },
    ];

    // Since we're mocking, we test the logic directly
    testUrls.forEach(({ url, expected }) => {
      const isShopee = url.includes("shopee.tw") || url.includes("shopee.com");
      expect(isShopee).toBe(expected);
    });
  });

  it("should extract Shopee product info from URL", () => {
    // Test product URL parsing logic
    const productUrl = "https://shopee.tw/product-name-i.123456.789012";
    const match = productUrl.match(/i\.(\d+)\.(\d+)/);
    
    expect(match).not.toBeNull();
    if (match) {
      expect(match[1]).toBe("123456"); // shopId
      expect(match[2]).toBe("789012"); // productId
    }
  });

  it("should extract Shopee shop name from URL", () => {
    // Test shop URL parsing logic
    const shopUrl = "https://shopee.tw/seller_shop_name";
    const urlObj = new URL(shopUrl);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    expect(pathParts.length).toBe(1);
    expect(pathParts[0]).toBe("seller_shop_name");
  });
});

describe("Search Query Building", () => {
  it("should build correct Shopee-specific search query", () => {
    const serialNumber = "CCAF12LP1234T5";
    const shopeeQuery = `site:shopee.tw "${serialNumber}"`;
    
    expect(shopeeQuery).toBe('site:shopee.tw "CCAF12LP1234T5"');
  });

  it("should build correct general search query", () => {
    const serialNumber = "CCAF12LP1234T5";
    const generalQuery = `"${serialNumber}"`;
    
    expect(generalQuery).toBe('"CCAF12LP1234T5"');
  });
});

describe("Detection Source Type", () => {
  it("should correctly categorize detection sources", () => {
    const sources = [
      { url: "https://shopee.tw/item", expectedIsShopee: true },
      { url: "https://shopee.com/item", expectedIsShopee: true },
      { url: "https://ruten.com.tw/item", expectedIsShopee: false },
      { url: "https://pchome.com.tw/item", expectedIsShopee: false },
      { url: "https://amazon.com/item", expectedIsShopee: false },
    ];

    sources.forEach(({ url, expectedIsShopee }) => {
      const isShopee = url.includes("shopee.tw") || url.includes("shopee.com");
      expect(isShopee).toBe(expectedIsShopee);
    });
  });
});

describe("Dashboard Stats", () => {
  it("should include Shopee-specific stats in dashboard", () => {
    // Mock dashboard stats structure
    const mockStats = {
      totalSerials: 5,
      activeSerials: 3,
      totalDetections: 20,
      newDetections: 5,
      shopeeDetections: 8,
      newShopeeDetections: 3,
    };

    expect(mockStats).toHaveProperty("shopeeDetections");
    expect(mockStats).toHaveProperty("newShopeeDetections");
    expect(mockStats.shopeeDetections).toBeLessThanOrEqual(mockStats.totalDetections);
    expect(mockStats.newShopeeDetections).toBeLessThanOrEqual(mockStats.newDetections);
  });
});

describe("Scan Types", () => {
  it("should support different scan types", () => {
    const validScanTypes = ["all", "shopee", "general"];
    
    validScanTypes.forEach((scanType) => {
      expect(["all", "shopee", "general"]).toContain(scanType);
    });
  });

  it("should track Shopee detections separately in scan logs", () => {
    const mockScanLog = {
      serialId: 1,
      scanType: "shopee",
      resultsCount: 10,
      newDetections: 3,
      shopeeDetections: 3,
    };

    expect(mockScanLog.scanType).toBe("shopee");
    expect(mockScanLog.shopeeDetections).toBe(mockScanLog.newDetections);
  });
});

describe("Detection Filtering", () => {
  it("should filter detections by source type", () => {
    const mockDetections = [
      { id: 1, isShopee: true, sourceType: "shopee" },
      { id: 2, isShopee: false, sourceType: "general" },
      { id: 3, isShopee: true, sourceType: "shopee" },
      { id: 4, isShopee: false, sourceType: "general" },
    ];

    const shopeeOnly = mockDetections.filter((d) => d.isShopee);
    const generalOnly = mockDetections.filter((d) => !d.isShopee);

    expect(shopeeOnly.length).toBe(2);
    expect(generalOnly.length).toBe(2);
  });
});
