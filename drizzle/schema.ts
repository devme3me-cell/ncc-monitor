import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Supports both local auth (email/password) and OAuth.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  // For OAuth users, this is the provider's user ID; for local users, this is a generated UUID
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  // Hashed password for local auth (null for OAuth users)
  passwordHash: varchar("passwordHash", { length: 255 }),
  // Login method: 'local', 'google', 'manus', etc.
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * NCC Serial Numbers table - stores user's NCC certification serial numbers
 */
export const nccSerials = mysqlTable("ncc_serials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  serialNumber: varchar("serialNumber", { length: 64 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastScanAt: timestamp("lastScanAt"),
  lastShopeeScanAt: timestamp("lastShopeeScanAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NccSerial = typeof nccSerials.$inferSelect;
export type InsertNccSerial = typeof nccSerials.$inferInsert;

/**
 * Detections table - stores detected misuse records from Google search
 */
export const detections = mysqlTable("detections", {
  id: int("id").autoincrement().primaryKey(),
  serialId: int("serialId").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 2048 }).notNull(),
  pageTitle: varchar("pageTitle", { length: 512 }),
  snippet: text("snippet"),
  // Source type: general search or Shopee-specific search
  sourceType: mysqlEnum("sourceType", ["general", "shopee"]).default("general").notNull(),
  // Is this URL from Shopee platform
  isShopee: boolean("isShopee").default(false).notNull(),
  // Shopee seller info (if applicable)
  shopeeShopId: varchar("shopeeShopId", { length: 64 }),
  shopeeProductId: varchar("shopeeProductId", { length: 64 }),
  shopeeShopName: varchar("shopeeShopName", { length: 255 }),
  status: mysqlEnum("status", ["new", "processed", "ignored"]).default("new").notNull(),
  detectedAt: timestamp("detectedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Detection = typeof detections.$inferSelect;
export type InsertDetection = typeof detections.$inferInsert;

/**
 * Scan Logs table - stores scan history for each serial number
 */
export const scanLogs = mysqlTable("scan_logs", {
  id: int("id").autoincrement().primaryKey(),
  serialId: int("serialId").notNull(),
  scanType: mysqlEnum("scanType", ["manual", "auto", "shopee"]).default("manual").notNull(),
  resultsCount: int("resultsCount").default(0).notNull(),
  newDetections: int("newDetections").default(0).notNull(),
  shopeeDetections: int("shopeeDetections").default(0).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type ScanLog = typeof scanLogs.$inferSelect;
export type InsertScanLog = typeof scanLogs.$inferInsert;
