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

// ==================== In-Memory Storage (Fallback) ====================
// Used when DATABASE_URL is not configured (e.g., demo/preview mode)

interface InMemorySerial {
  id: number;
  userId: number;
  name: string;
  serialNumber: string;
  isActive: boolean;
  lastScanAt: Date | null;
  lastShopeeScanAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InMemoryDetection {
  id: number;
  serialId: number;
  sourceUrl: string;
  pageTitle: string | null;
  snippet: string | null;
  sourceType: "general" | "shopee";
  isShopee: boolean;
  shopeeShopId: string | null;
  shopeeProductId: string | null;
  shopeeShopName: string | null;
  status: "new" | "processed" | "ignored";
  detectedAt: Date;
  createdAt: Date;
}

const inMemoryStore = {
  serials: [] as InMemorySerial[],
  detections: [] as InMemoryDetection[],
  nextSerialId: 1,
  nextDetectionId: 1,
};

console.log("[Database] In-memory storage initialized for demo mode");

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
    console.warn("[Database] Cannot upsert user: database not available (demo mode)");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    for (const field of textFields) {
      if (user[field] !== undefined) {
        values[field] = user[field];
        updateSet[field] = sql`VALUES(${sql.identifier(field)})`;
      }
    }

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Error upserting user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== NCC Serial Functions ====================

export async function getUserSerials(userId: number): Promise<NccSerial[]> {
  const db = await getDb();
  if (!db) {
    // Return from in-memory storage
    return inMemoryStore.serials
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) as NccSerial[];
  }

  return db
    .select()
    .from(nccSerials)
    .where(eq(nccSerials.userId, userId))
    .orderBy(desc(nccSerials.createdAt));
}

export async function getSerialById(id: number, userId: number): Promise<NccSerial | undefined> {
  const db = await getDb();
  if (!db) {
    // Return from in-memory storage
    const serial = inMemoryStore.serials.find(s => s.id === id && s.userId === userId);
    return serial as NccSerial | undefined;
  }

  const result = await db
    .select()
    .from(nccSerials)
    .where(and(eq(nccSerials.id, id), eq(nccSerials.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSerial(data: InsertNccSerial): Promise<number> {
  const db = await getDb();
  if (!db) {
    // Use in-memory storage
    const now = new Date();
    const newSerial: InMemorySerial = {
      id: inMemoryStore.nextSerialId++,
      userId: data.userId,
      name: data.name,
      serialNumber: data.serialNumber,
      isActive: data.isActive ?? true,
      lastScanAt: null,
      lastShopeeScanAt: null,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryStore.serials.push(newSerial);
    console.log("[Database] Created serial in memory:", newSerial);
    return newSerial.id;
  }

  const result = await db.insert(nccSerials).values(data);
  return Number(result[0].insertId);
}

export async function updateSerial(
  id: number,
  userId: number,
  data: Partial<Omit<InsertNccSerial, "id" | "userId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    // Update in-memory storage
    const serial = inMemoryStore.serials.find(s => s.id === id && s.userId === userId);
    if (serial) {
      Object.assign(serial, data, { updatedAt: new Date() });
      console.log("[Database] Updated serial in memory:", serial);
    }
    return;
  }

  await db
    .update(nccSerials)
    .set(data)
    .where(and(eq(nccSerials.id, id), eq(nccSerials.userId, userId)));
}

export async function deleteSerial(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    // Delete from in-memory storage
    const index = inMemoryStore.serials.findIndex(s => s.id === id && s.userId === userId);
    if (index !== -1) {
      inMemoryStore.serials.splice(index, 1);
      // Also delete related detections
      inMemoryStore.detections = inMemoryStore.detections.filter(d => d.serialId !== id);
      console.log("[Database] Deleted serial from memory:", id);
    }
    return;
  }

  // Delete related detections first
  await db.delete(detections).where(eq(detections.serialId, id));
  await db.delete(scanLogs).where(eq(scanLogs.serialId, id));
  await db
    .delete(nccSerials)
    .where(and(eq(nccSerials.id, id), eq(nccSerials.userId, userId)));
}

export async function updateSerialLastScan(
  serialId: number,
  scanType: "all" | "shopee" | "general"
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  
  if (!db) {
    // Update in-memory storage
    const serial = inMemoryStore.serials.find(s => s.id === serialId);
    if (serial) {
      if (scanType === "shopee") {
        serial.lastShopeeScanAt = now;
      } else {
        serial.lastScanAt = now;
      }
      serial.updatedAt = now;
    }
    return;
  }

  if (scanType === "shopee") {
    await db
      .update(nccSerials)
      .set({ lastShopeeScanAt: now })
      .where(eq(nccSerials.id, serialId));
  } else {
    await db
      .update(nccSerials)
      .set({ lastScanAt: now })
      .where(eq(nccSerials.id, serialId));
  }
}

// ==================== Detection Functions ====================

export async function getDetectionsByUser(
  userId: number,
  filter?: { isShopee?: boolean }
): Promise<Detection[]> {
  const db = await getDb();
  if (!db) {
    // Return from in-memory storage
    const userSerialIds = inMemoryStore.serials
      .filter(s => s.userId === userId)
      .map(s => s.id);
    
    let results = inMemoryStore.detections.filter(d => userSerialIds.includes(d.serialId));
    
    if (filter?.isShopee !== undefined) {
      results = results.filter(d => d.isShopee === filter.isShopee);
    }
    
    return results.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()) as Detection[];
  }

  // Get all serial IDs for this user
  const userSerials = await db
    .select({ id: nccSerials.id })
    .from(nccSerials)
    .where(eq(nccSerials.userId, userId));

  if (userSerials.length === 0) return [];

  const serialIds = userSerials.map((s) => s.id);

  let query = db
    .select()
    .from(detections)
    .where(sql`${detections.serialId} IN (${sql.join(serialIds.map(id => sql`${id}`), sql`, `)})`);

  if (filter?.isShopee !== undefined) {
    query = query.where(eq(detections.isShopee, filter.isShopee)) as typeof query;
  }

  return query.orderBy(desc(detections.detectedAt));
}

export async function getDetectionsBySerial(serialId: number): Promise<Detection[]> {
  const db = await getDb();
  if (!db) {
    // Return from in-memory storage
    return inMemoryStore.detections
      .filter(d => d.serialId === serialId)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()) as Detection[];
  }

  return db
    .select()
    .from(detections)
    .where(eq(detections.serialId, serialId))
    .orderBy(desc(detections.detectedAt));
}

export async function checkDetectionExists(
  serialId: number,
  sourceUrl: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    // Check in-memory storage
    return inMemoryStore.detections.some(d => d.serialId === serialId && d.sourceUrl === sourceUrl);
  }

  const result = await db
    .select({ id: detections.id })
    .from(detections)
    .where(and(eq(detections.serialId, serialId), eq(detections.sourceUrl, sourceUrl)))
    .limit(1);

  return result.length > 0;
}

export async function createDetection(data: InsertDetection): Promise<number> {
  const db = await getDb();
  if (!db) {
    // Use in-memory storage
    const now = new Date();
    const newDetection: InMemoryDetection = {
      id: inMemoryStore.nextDetectionId++,
      serialId: data.serialId,
      sourceUrl: data.sourceUrl,
      pageTitle: data.pageTitle ?? null,
      snippet: data.snippet ?? null,
      sourceType: data.sourceType ?? "general",
      isShopee: data.isShopee ?? false,
      shopeeShopId: data.shopeeShopId ?? null,
      shopeeProductId: data.shopeeProductId ?? null,
      shopeeShopName: data.shopeeShopName ?? null,
      status: data.status ?? "new",
      detectedAt: now,
      createdAt: now,
    };
    inMemoryStore.detections.push(newDetection);
    console.log("[Database] Created detection in memory:", newDetection.id);
    return newDetection.id;
  }

  const result = await db.insert(detections).values(data);
  return Number(result[0].insertId);
}

export async function updateDetectionStatus(
  id: number,
  status: "new" | "processed" | "ignored"
): Promise<void> {
  const db = await getDb();
  if (!db) {
    // Update in-memory storage
    const detection = inMemoryStore.detections.find(d => d.id === id);
    if (detection) {
      detection.status = status;
    }
    return;
  }

  await db.update(detections).set({ status }).where(eq(detections.id, id));
}

export async function getNewDetectionsCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    // Count from in-memory storage
    const userSerialIds = inMemoryStore.serials
      .filter(s => s.userId === userId)
      .map(s => s.id);
    
    return inMemoryStore.detections.filter(
      d => userSerialIds.includes(d.serialId) && d.status === "new"
    ).length;
  }

  // Get all serial IDs for this user
  const userSerials = await db
    .select({ id: nccSerials.id })
    .from(nccSerials)
    .where(eq(nccSerials.userId, userId));

  if (userSerials.length === 0) return 0;

  const serialIds = userSerials.map((s) => s.id);

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(detections)
    .where(
      and(
        sql`${detections.serialId} IN (${sql.join(serialIds.map(id => sql`${id}`), sql`, `)})`,
        eq(detections.status, "new")
      )
    );

  return result[0]?.count ?? 0;
}

// ==================== Scan Log Functions ====================

export async function createScanLog(data: InsertScanLog): Promise<void> {
  const db = await getDb();
  if (!db) {
    // Skip scan logs in demo mode
    console.log("[Database] Scan log skipped in demo mode:", data);
    return;
  }

  await db.insert(scanLogs).values(data);
}

// ==================== Dashboard Stats ====================

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) {
    // Return stats from in-memory storage
    const userSerials = inMemoryStore.serials.filter(s => s.userId === userId);
    const userSerialIds = userSerials.map(s => s.id);
    const userDetections = inMemoryStore.detections.filter(d => userSerialIds.includes(d.serialId));
    
    return {
      totalSerials: userSerials.length,
      activeSerials: userSerials.filter(s => s.isActive).length,
      totalDetections: userDetections.length,
      newDetections: userDetections.filter(d => d.status === "new").length,
      shopeeDetections: userDetections.filter(d => d.isShopee).length,
      recentDetections: userDetections
        .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
        .slice(0, 5) as Detection[],
    };
  }

  const userSerials = await getUserSerials(userId);
  const serialIds = userSerials.map((s) => s.id);

  if (serialIds.length === 0) {
    return {
      totalSerials: 0,
      activeSerials: 0,
      totalDetections: 0,
      newDetections: 0,
      shopeeDetections: 0,
      recentDetections: [],
    };
  }

  const [totalDetectionsResult, newDetectionsResult, shopeeDetectionsResult] =
    await Promise.all([
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(detections)
        .where(sql`${detections.serialId} IN (${sql.join(serialIds.map(id => sql`${id}`), sql`, `)})`),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(detections)
        .where(
          and(
            sql`${detections.serialId} IN (${sql.join(serialIds.map(id => sql`${id}`), sql`, `)})`,
            eq(detections.status, "new")
          )
        ),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(detections)
        .where(
          and(
            sql`${detections.serialId} IN (${sql.join(serialIds.map(id => sql`${id}`), sql`, `)})`,
            eq(detections.isShopee, true)
          )
        ),
    ]);

  const recentDetections = await db
    .select()
    .from(detections)
    .where(sql`${detections.serialId} IN (${sql.join(serialIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(detections.detectedAt))
    .limit(5);

  return {
    totalSerials: userSerials.length,
    activeSerials: userSerials.filter((s) => s.isActive).length,
    totalDetections: totalDetectionsResult[0]?.count ?? 0,
    newDetections: newDetectionsResult[0]?.count ?? 0,
    shopeeDetections: shopeeDetectionsResult[0]?.count ?? 0,
    recentDetections,
  };
}
