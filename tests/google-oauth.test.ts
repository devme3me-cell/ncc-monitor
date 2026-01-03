import { describe, it, expect } from "vitest";

describe("Google OAuth Configuration", () => {
  it("should have GOOGLE_CLIENT_ID environment variable set", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe("");
    expect(clientId?.length).toBeGreaterThan(10);
    // Google Client IDs typically end with .apps.googleusercontent.com
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("should have GOOGLE_CLIENT_SECRET environment variable set", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe("");
    expect(clientSecret?.length).toBeGreaterThan(10);
  });

  it("should have valid Google OAuth credentials format", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Client ID should be a valid format
    expect(clientId).toMatch(/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
    
    // Client Secret should not contain spaces or special characters that would break URLs
    expect(clientSecret).not.toMatch(/\s/);
  });
});
