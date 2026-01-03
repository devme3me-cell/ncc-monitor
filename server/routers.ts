import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { performGoogleSearch, performShopeeSearch, extractShopeeSellerInfo, SearchType } from "./search";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // NCC Serial Number Management
  serials: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserSerials(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return db.getSerialById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          serialNumber: z.string().min(1).max(64),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createSerial({
          userId: ctx.user.id,
          name: input.name,
          serialNumber: input.serialNumber.toUpperCase(),
          isActive: input.isActive,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          serialNumber: z.string().min(1).max(64).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        if (data.serialNumber) {
          data.serialNumber = data.serialNumber.toUpperCase();
        }
        await db.updateSerial(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSerial(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Detection Records
  detections: router({
    list: protectedProcedure
      .input(
        z
          .object({
            filter: z.enum(["all", "shopee", "general"]).optional(),
          })
          .optional()
      )
      .query(({ ctx, input }) => {
        const filter = input?.filter;
        if (filter === "shopee") {
          return db.getDetectionsByUser(ctx.user.id, { isShopee: true });
        } else if (filter === "general") {
          return db.getDetectionsByUser(ctx.user.id, { isShopee: false });
        }
        return db.getDetectionsByUser(ctx.user.id);
      }),

    bySerial: protectedProcedure
      .input(z.object({ serialId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify ownership
        const serial = await db.getSerialById(input.serialId, ctx.user.id);
        if (!serial) {
          return [];
        }
        return db.getDetectionsBySerial(input.serialId);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["new", "processed", "ignored"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateDetectionStatus(input.id, input.status);
        return { success: true };
      }),

    newCount: protectedProcedure.query(({ ctx }) => {
      return db.getNewDetectionsCount(ctx.user.id);
    }),
  }),

  // Dashboard Stats
  dashboard: router({
    stats: protectedProcedure.query(({ ctx }) => {
      return db.getDashboardStats(ctx.user.id);
    }),
  }),

  // Scan Operations
  scan: router({
    // Scan a single serial number
    single: protectedProcedure
      .input(
        z.object({
          serialId: z.number(),
          searchType: z.enum(["all", "shopee", "general"]).default("all"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const serial = await db.getSerialById(input.serialId, ctx.user.id);
        if (!serial) {
          throw new Error("Serial not found");
        }

        const results = await performGoogleSearch(
          serial.serialNumber,
          input.searchType as SearchType
        );
        let newDetections = 0;
        let shopeeDetections = 0;

        for (const result of results) {
          const exists = await db.checkDetectionExists(serial.id, result.url);
          if (!exists) {
            // Extract Shopee seller info if applicable
            const shopeeInfo = result.isShopee ? extractShopeeSellerInfo(result.url) : null;

            await db.createDetection({
              serialId: serial.id,
              sourceUrl: result.url,
              pageTitle: result.title,
              snippet: result.snippet,
              sourceType: result.source,
              isShopee: result.isShopee,
              shopeeShopId: shopeeInfo?.shopId || null,
              shopeeProductId: shopeeInfo?.productId || null,
              shopeeShopName: shopeeInfo?.shopName || null,
              status: "new",
            });
            newDetections++;
            if (result.isShopee) {
              shopeeDetections++;
            }
          }
        }

        // Update last scan time based on search type
        await db.updateSerialLastScan(
          serial.id,
          input.searchType === "shopee" ? "shopee" : input.searchType === "general" ? "general" : "all"
        );

        await db.createScanLog({
          serialId: serial.id,
          scanType: input.searchType === "shopee" ? "shopee" : "manual",
          resultsCount: results.length,
          newDetections,
          shopeeDetections,
        });

        // Notify owner if new detections found
        if (newDetections > 0) {
          const shopeeNote =
            shopeeDetections > 0 ? `（其中 ${shopeeDetections} 筆來自蝦皮）` : "";
          await notifyOwner({
            title: `NCC 序號監控警報`,
            content: `序號「${serial.name}」(${serial.serialNumber}) 發現 ${newDetections} 筆新的冒用記錄${shopeeNote}！請立即查看。`,
          });
        }

        return {
          totalResults: results.length,
          newDetections,
          shopeeDetections,
        };
      }),

    // Shopee-specific scan for a single serial
    shopee: protectedProcedure
      .input(z.object({ serialId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const serial = await db.getSerialById(input.serialId, ctx.user.id);
        if (!serial) {
          throw new Error("Serial not found");
        }

        const results = await performShopeeSearch(serial.serialNumber);
        let newDetections = 0;

        for (const result of results) {
          const exists = await db.checkDetectionExists(serial.id, result.url);
          if (!exists) {
            const shopeeInfo = extractShopeeSellerInfo(result.url);

            await db.createDetection({
              serialId: serial.id,
              sourceUrl: result.url,
              pageTitle: result.title,
              snippet: result.snippet,
              sourceType: "shopee",
              isShopee: true,
              shopeeShopId: shopeeInfo?.shopId || null,
              shopeeProductId: shopeeInfo?.productId || null,
              shopeeShopName: shopeeInfo?.shopName || null,
              status: "new",
            });
            newDetections++;
          }
        }

        await db.updateSerialLastScan(serial.id, "shopee");
        await db.createScanLog({
          serialId: serial.id,
          scanType: "shopee",
          resultsCount: results.length,
          newDetections,
          shopeeDetections: newDetections,
        });

        // Notify owner if new Shopee detections found
        if (newDetections > 0) {
          await notifyOwner({
            title: `蝦皮冒用警報`,
            content: `序號「${serial.name}」(${serial.serialNumber}) 在蝦皮發現 ${newDetections} 筆新的冒用記錄！請立即查看並向蝦皮舉報。`,
          });
        }

        return {
          totalResults: results.length,
          newDetections,
          shopeeDetections: newDetections,
        };
      }),

    // Scan all active serials
    all: protectedProcedure
      .input(
        z
          .object({
            searchType: z.enum(["all", "shopee", "general"]).default("all"),
          })
          .optional()
      )
      .mutation(async ({ ctx, input }) => {
        const searchType = (input?.searchType || "all") as SearchType;
        const serials = await db.getUserSerials(ctx.user.id);
        const activeSerials = serials.filter((s) => s.isActive);

        let totalNewDetections = 0;
        let totalShopeeDetections = 0;
        const scanResults: {
          serialId: number;
          name: string;
          newDetections: number;
          shopeeDetections: number;
        }[] = [];

        for (const serial of activeSerials) {
          const results = await performGoogleSearch(serial.serialNumber, searchType);
          let newDetections = 0;
          let shopeeDetections = 0;

          for (const result of results) {
            const exists = await db.checkDetectionExists(serial.id, result.url);
            if (!exists) {
              const shopeeInfo = result.isShopee ? extractShopeeSellerInfo(result.url) : null;

              await db.createDetection({
                serialId: serial.id,
                sourceUrl: result.url,
                pageTitle: result.title,
                snippet: result.snippet,
                sourceType: result.source,
                isShopee: result.isShopee,
                shopeeShopId: shopeeInfo?.shopId || null,
                shopeeProductId: shopeeInfo?.productId || null,
                shopeeShopName: shopeeInfo?.shopName || null,
                status: "new",
              });
              newDetections++;
              if (result.isShopee) {
                shopeeDetections++;
              }
            }
          }

          await db.updateSerialLastScan(
            serial.id,
            searchType === "shopee" ? "shopee" : searchType === "general" ? "general" : "all"
          );
          await db.createScanLog({
            serialId: serial.id,
            scanType: searchType === "shopee" ? "shopee" : "manual",
            resultsCount: results.length,
            newDetections,
            shopeeDetections,
          });

          totalNewDetections += newDetections;
          totalShopeeDetections += shopeeDetections;
          scanResults.push({
            serialId: serial.id,
            name: serial.name,
            newDetections,
            shopeeDetections,
          });
        }

        // Notify owner if new detections found
        if (totalNewDetections > 0) {
          const detailLines = scanResults
            .filter((r) => r.newDetections > 0)
            .map((r) => {
              const shopeeNote = r.shopeeDetections > 0 ? ` (蝦皮: ${r.shopeeDetections})` : "";
              return `• ${r.name}: ${r.newDetections} 筆${shopeeNote}`;
            })
            .join("\n");

          const shopeeTotal =
            totalShopeeDetections > 0 ? `（其中 ${totalShopeeDetections} 筆來自蝦皮）` : "";

          await notifyOwner({
            title: `NCC 序號監控警報`,
            content: `掃描完成，共發現 ${totalNewDetections} 筆新的冒用記錄${shopeeTotal}：\n${detailLines}`,
          });
        }

        return {
          scannedCount: activeSerials.length,
          totalNewDetections,
          totalShopeeDetections,
          results: scanResults,
        };
      }),

    // Shopee-only scan for all active serials
    allShopee: protectedProcedure.mutation(async ({ ctx }) => {
      const serials = await db.getUserSerials(ctx.user.id);
      const activeSerials = serials.filter((s) => s.isActive);

      let totalNewDetections = 0;
      const scanResults: {
        serialId: number;
        name: string;
        newDetections: number;
      }[] = [];

      for (const serial of activeSerials) {
        const results = await performShopeeSearch(serial.serialNumber);
        let newDetections = 0;

        for (const result of results) {
          const exists = await db.checkDetectionExists(serial.id, result.url);
          if (!exists) {
            const shopeeInfo = extractShopeeSellerInfo(result.url);

            await db.createDetection({
              serialId: serial.id,
              sourceUrl: result.url,
              pageTitle: result.title,
              snippet: result.snippet,
              sourceType: "shopee",
              isShopee: true,
              shopeeShopId: shopeeInfo?.shopId || null,
              shopeeProductId: shopeeInfo?.productId || null,
              shopeeShopName: shopeeInfo?.shopName || null,
              status: "new",
            });
            newDetections++;
          }
        }

        await db.updateSerialLastScan(serial.id, "shopee");
        await db.createScanLog({
          serialId: serial.id,
          scanType: "shopee",
          resultsCount: results.length,
          newDetections,
          shopeeDetections: newDetections,
        });

        totalNewDetections += newDetections;
        scanResults.push({
          serialId: serial.id,
          name: serial.name,
          newDetections,
        });
      }

      // Notify owner if new Shopee detections found
      if (totalNewDetections > 0) {
        const detailLines = scanResults
          .filter((r) => r.newDetections > 0)
          .map((r) => `• ${r.name}: ${r.newDetections} 筆`)
          .join("\n");

        await notifyOwner({
          title: `蝦皮冒用警報`,
          content: `蝦皮專屬掃描完成，共發現 ${totalNewDetections} 筆新的冒用記錄：\n${detailLines}\n\n請立即查看並向蝦皮舉報。`,
        });
      }

      return {
        scannedCount: activeSerials.length,
        totalNewDetections,
        results: scanResults,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
