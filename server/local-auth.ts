import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, InsertUser } from "../drizzle/schema";

/**
 * Hash a password using SHA-256 with salt
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const inputHash = createHash("sha256")
    .update(salt + password)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(inputHash, "hex"));
  } catch {
    return false;
  }
}

/**
 * Generate a unique openId for local users
 */
export function generateLocalOpenId(): string {
  return `local_${randomBytes(16).toString("hex")}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * - At least 6 characters
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: "密碼至少需要 6 個字元" };
  }
  return { valid: true };
}

/**
 * Register a new local user
 */
export async function registerLocalUser(
  db: ReturnType<typeof drizzle>,
  email: string,
  password: string,
  name?: string
): Promise<{ success: boolean; userId?: number; error?: string }> {
  // Validate email
  if (!isValidEmail(email)) {
    return { success: false, error: "請輸入有效的電子郵件地址" };
  }

  // Validate password
  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.message };
  }

  // Check if email already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: "此電子郵件已被註冊" };
  }

  // Create new user
  const openId = generateLocalOpenId();
  const passwordHash = hashPassword(password);

  const userData: InsertUser = {
    openId,
    email,
    name: name || email.split("@")[0],
    passwordHash,
    loginMethod: "local",
  };

  const result = await db.insert(users).values(userData);
  const userId = Number(result[0].insertId);

  return { success: true, userId };
}

/**
 * Authenticate a local user
 */
export async function authenticateLocalUser(
  db: ReturnType<typeof drizzle>,
  email: string,
  password: string
): Promise<{ success: boolean; user?: typeof users.$inferSelect; error?: string }> {
  // Find user by email
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (userResult.length === 0) {
    return { success: false, error: "電子郵件或密碼錯誤" };
  }

  const user = userResult[0];

  // Check if user has a password (local auth)
  if (!user.passwordHash) {
    return { success: false, error: "此帳號使用其他方式登入" };
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: "電子郵件或密碼錯誤" };
  }

  // Update last signed in
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  return { success: true, user };
}
