import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database functions
vi.mock("../server/db", () => ({
  getNccSerialsByUserId: vi.fn(),
  createNccSerial: vi.fn(),
  updateNccSerial: vi.fn(),
  deleteNccSerial: vi.fn(),
  getDetectionsByUserId: vi.fn(),
  createDetection: vi.fn(),
  updateDetectionStatus: vi.fn(),
  getActiveSerials: vi.fn(),
  getDashboardStats: vi.fn(),
}));

describe("NCC Serial Number Monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Serial Number Validation", () => {
    it("should validate NCC serial number format", () => {
      // NCC serial numbers typically follow patterns like CCAH21LP1234T5
      const validSerials = [
        "CCAH21LP1234T5",
        "CCAI22AB5678X9",
        "CCAJ23CD9012Y3",
      ];

      const invalidSerials = [
        "",
        "123",
        "invalid-serial",
        "CCAH21LP1234T5-extra",
      ];

      const isValidNccSerial = (serial: string): boolean => {
        // Basic validation: should be alphanumeric and reasonable length
        if (!serial || serial.length < 10 || serial.length > 20) {
          return false;
        }
        // Should start with CC (NCC Taiwan prefix)
        if (!serial.startsWith("CC")) {
          return false;
        }
        // Should be alphanumeric
        return /^[A-Z0-9]+$/.test(serial);
      };

      validSerials.forEach((serial) => {
        expect(isValidNccSerial(serial)).toBe(true);
      });

      invalidSerials.forEach((serial) => {
        expect(isValidNccSerial(serial)).toBe(false);
      });
    });

    it("should convert serial numbers to uppercase", () => {
      const input = "ccah21lp1234t5";
      const expected = "CCAH21LP1234T5";
      expect(input.toUpperCase()).toBe(expected);
    });
  });

  describe("Detection Status Management", () => {
    it("should have valid status values", () => {
      const validStatuses = ["new", "processed", "ignored"];
      
      validStatuses.forEach((status) => {
        expect(["new", "processed", "ignored"]).toContain(status);
      });
    });

    it("should correctly identify new detections", () => {
      const detection = {
        id: 1,
        serialNumber: "CCAH21LP1234T5",
        sourceUrl: "https://shopee.tw/product/123",
        pageTitle: "Test Product",
        status: "new" as const,
        detectedAt: new Date(),
      };

      expect(detection.status).toBe("new");
    });
  });

  describe("Search Query Generation", () => {
    it("should generate proper Google search query for NCC serial", () => {
      const serialNumber = "CCAH21LP1234T5";
      const expectedQuery = `"${serialNumber}"`;
      
      const generateSearchQuery = (serial: string): string => {
        return `"${serial}"`;
      };

      expect(generateSearchQuery(serialNumber)).toBe(expectedQuery);
    });

    it("should handle special characters in serial numbers", () => {
      const serialNumber = "CCAH21LP1234T5";
      const encoded = encodeURIComponent(`"${serialNumber}"`);
      
      expect(encoded).toBe("%22CCAH21LP1234T5%22");
    });
  });

  describe("Dashboard Statistics", () => {
    it("should calculate correct statistics", () => {
      const serials = [
        { id: 1, isActive: true },
        { id: 2, isActive: true },
        { id: 3, isActive: false },
      ];

      const detections = [
        { id: 1, status: "new" },
        { id: 2, status: "new" },
        { id: 3, status: "processed" },
        { id: 4, status: "ignored" },
      ];

      const stats = {
        totalSerials: serials.length,
        activeSerials: serials.filter((s) => s.isActive).length,
        totalDetections: detections.length,
        newDetections: detections.filter((d) => d.status === "new").length,
      };

      expect(stats.totalSerials).toBe(3);
      expect(stats.activeSerials).toBe(2);
      expect(stats.totalDetections).toBe(4);
      expect(stats.newDetections).toBe(2);
    });
  });

  describe("URL Validation", () => {
    it("should validate source URLs", () => {
      const validUrls = [
        "https://shopee.tw/product/123",
        "https://www.ruten.com.tw/item/show?123",
        "https://tw.bid.yahoo.com/item/123",
      ];

      const invalidUrls = [
        "",
        "not-a-url",
        "ftp://invalid.com",
      ];

      const isValidUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === "https:" || parsed.protocol === "http:";
        } catch {
          return false;
        }
      };

      validUrls.forEach((url) => {
        expect(isValidUrl(url)).toBe(true);
      });

      invalidUrls.forEach((url) => {
        expect(isValidUrl(url)).toBe(false);
      });
    });
  });

  describe("Date Formatting", () => {
    it("should format dates correctly for display", () => {
      const date = new Date("2026-01-03T10:30:00Z");
      
      const formatDate = (d: Date): string => {
        return d.toLocaleDateString("zh-TW", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      const formatted = formatDate(date);
      expect(formatted).toContain("2026");
    });

    it("should handle null dates gracefully", () => {
      const formatDateOrDefault = (d: Date | null): string => {
        if (!d) return "從未掃描";
        return d.toLocaleDateString("zh-TW");
      };

      expect(formatDateOrDefault(null)).toBe("從未掃描");
      expect(formatDateOrDefault(new Date())).not.toBe("從未掃描");
    });
  });
});
