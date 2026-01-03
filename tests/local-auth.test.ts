import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateLocalOpenId,
  isValidEmail,
  isValidPassword,
} from "../server/local-auth";

describe("Password Hashing", () => {
  it("should hash a password with salt", () => {
    const password = "testPassword123";
    const hash = hashPassword(password);

    // Hash should contain salt and hash separated by colon
    expect(hash).toContain(":");
    const [salt, hashPart] = hash.split(":");
    expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(hashPart).toHaveLength(64); // SHA-256 = 64 hex chars
  });

  it("should generate different hashes for same password", () => {
    const password = "testPassword123";
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    // Different salts should produce different hashes
    expect(hash1).not.toBe(hash2);
  });
});

describe("Password Verification", () => {
  it("should verify correct password", () => {
    const password = "testPassword123";
    const hash = hashPassword(password);

    expect(verifyPassword(password, hash)).toBe(true);
  });

  it("should reject incorrect password", () => {
    const password = "testPassword123";
    const wrongPassword = "wrongPassword456";
    const hash = hashPassword(password);

    expect(verifyPassword(wrongPassword, hash)).toBe(false);
  });

  it("should reject malformed hash", () => {
    expect(verifyPassword("password", "invalid-hash")).toBe(false);
    expect(verifyPassword("password", "")).toBe(false);
  });
});

describe("OpenId Generation", () => {
  it("should generate unique local openIds", () => {
    const openId1 = generateLocalOpenId();
    const openId2 = generateLocalOpenId();

    expect(openId1).toMatch(/^local_[a-f0-9]{32}$/);
    expect(openId2).toMatch(/^local_[a-f0-9]{32}$/);
    expect(openId1).not.toBe(openId2);
  });
});

describe("Email Validation", () => {
  it("should accept valid emails", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name@domain.co.tw")).toBe(true);
    expect(isValidEmail("user+tag@gmail.com")).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user@domain")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("Password Validation", () => {
  it("should accept valid passwords", () => {
    expect(isValidPassword("123456")).toEqual({ valid: true });
    expect(isValidPassword("password")).toEqual({ valid: true });
    expect(isValidPassword("longpassword123")).toEqual({ valid: true });
  });

  it("should reject short passwords", () => {
    const result = isValidPassword("12345");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("密碼至少需要 6 個字元");
  });

  it("should reject empty passwords", () => {
    const result = isValidPassword("");
    expect(result.valid).toBe(false);
  });
});
