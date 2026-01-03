import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  nccSerials,
  InsertNccSerial,
  NccSerial,
  detections,
  InsertDetection,
  Detection,
  scanLogs,
  InsertScanLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== User Functions ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== NCC Serial Functions ====================

export async function getUserSerials(userId: number): Promise<NccSerial[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(nccSerials)
    .where(eq(nccSerials.userId, userId))
    .orderBy(desc(nccSerials.createdAt));
}

export async function getSerialById(id: number, userId: number): Promise<NccSerial | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(nccSerials)
    .where(and(eq(nccSerials.id, id), eq(nccSerials.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSerial(data: InsertNccSerial): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(nccSerials).values(data);
  return Number(result[0].insertId);
}

export async function updateSerial(
  id: number,
  userId: number,
  data: Partial<Omit<InsertNccSerial, "id" | "userId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(nccSerials)
    .set(data)
    .where(and(eq(nccSerials.id, id), eq(nccSerials.userId, userId)));
}

export async function deleteSerial(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related detections first
  const serial = await getSerialById(id, userId);
  if (serial) {
    await db.delete(detections).where(eq(detections.serialId, id));
    await db.delete(scanLogs).where(eq(scanLogs.serialId, id));
  }

  await db
    .delete(nccSerials)
    .where(and(eq(nccSerials.id, id), eq(nccSerials.userId, userId)));
}

export async function getActiveSerials(): Promise<NccSerial[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(nccSerials).where(eq(nccSerials.isActive, true));
}

export async function updateSerialLastScan(
  id: number,
  scanType: "general" | "shopee" | "all" = "all"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<NccSerial> = {};
  const now = new Date();

  if (scanType === "all" || scanType === "general") {
    updateData.lastScanAt = now;
  }
  if (scanType === "all" || scanType === "shopee") {
    updateData.lastShopeeScanAt = now;
  }

  await db.update(nccSerials).set(updateData).where(eq(nccSerials.id, id));
}

// ==================== Detection Functions ====================

export async function getDetectionsBySerial(serialId: number): Promise<Detection[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(detections)
    .where(eq(detections.serialId, serialId))
    .orderBy(desc(detections.detectedAt));
}

export async function getDetectionsByUser(
  userId: number,
  filter?: { isShopee?: boolean; sourceType?: "general" | "shopee" }
): Promise<(Detection & { serialName: string; serialNumber: string })[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(nccSerials.userId, userId)];

  if (filter?.isShopee !== undefined) {
    conditions.push(eq(detections.isShopee, filter.isShopee));
  }
  if (filter?.sourceType) {
    conditions.push(eq(detections.sourceType, filter.sourceType));
  }

  const result = await db
    .select({
      id: detections.id,
      serialId: detections.serialId,
      sourceUrl: detections.sourceUrl,
      pageTitle: detections.pageTitle,
      snippet: detections.snippet,
      sourceType: detections.sourceType,
      isShopee: detections.isShopee,
      shopeeShopId: detections.shopeeShopId,
      shopeeProductId: detections.shopeeProductId,
      shopeeShopName: detections.shopeeShopName,
      status: detections.status,
      detectedAt: detections.detectedAt,
      createdAt: detections.createdAt,
      serialName: nccSerials.name,
      serialNumber: nccSerials.serialNumber,
    })
    .from(detections)
    .innerJoin(nccSerials, eq(detections.serialId, nccSerials.id))
    .where(and(...conditions))
    .orderBy(desc(detections.detectedAt));

  return result;
}

export async function getNewDetectionsCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(detections)
    .innerJoin(nccSerials, eq(detections.serialId, nccSerials.id))
    .where(and(eq(nccSerials.userId, userId), eq(detections.status, "new")));

  return result[0]?.count ?? 0;
}

export async function createDetection(data: InsertDetection): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(detections).values(data);
  return Number(result[0].insertId);
}

export async function updateDetectionStatus(
  id: number,
  status: "new" | "processed" | "ignored"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(detections).set({ status }).where(eq(detections.id, id));
}

export async function checkDetectionExists(serialId: number, sourceUrl: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select({ id: detections.id })
    .from(detections)
    .where(and(eq(detections.serialId, serialId), eq(detections.sourceUrl, sourceUrl)))
    .limit(1);

  return result.length > 0;
}

// ==================== Scan Log Functions ====================

export async function createScanLog(data: InsertScanLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(scanLogs).values(data);
  return Number(result[0].insertId);
}

export async function getRecentScanLogs(
  serialId: number,
  limit: number = 10
): Promise<typeof scanLogs.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(scanLogs)
    .where(eq(scanLogs.serialId, serialId))
    .orderBy(desc(scanLogs.completedAt))
    .limit(limit);
}

// ==================== Dashboard Stats ====================

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalSerials: 0,
      activeSerials: 0,
      totalDetections: 0,
      newDetections: 0,
      shopeeDetections: 0,
      newShopeeDetections: 0,
    };
  }

  const serialsResult = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when isActive = true then 1 else 0 end)`,
    })
    .from(nccSerials)
    .where(eq(nccSerials.userId, userId));

  const detectionsResult = await db
    .select({
      total: sql<number>`count(*)`,
      new: sql<number>`sum(case when ${detections.status} = 'new' then 1 else 0 end)`,
      shopee: sql<number>`sum(case when ${detections.isShopee} = true then 1 else 0 end)`,
      newShopee: sql<number>`sum(case when ${detections.isShopee} = true and ${detections.status} = 'new' then 1 else 0 end)`,
    })
    .from(detections)
    .innerJoin(nccSerials, eq(detections.serialId, nccSerials.id))
    .where(eq(nccSerials.userId, userId));

  return {
    totalSerials: serialsResult[0]?.total ?? 0,
    activeSerials: serialsResult[0]?.active ?? 0,
    totalDetections: detectionsResult[0]?.total ?? 0,
    newDetections: detectionsResult[0]?.new ?? 0,
    shopeeDetections: detectionsResult[0]?.shopee ?? 0,
    newShopeeDetections: detectionsResult[0]?.newShopee ?? 0,
  };
}
