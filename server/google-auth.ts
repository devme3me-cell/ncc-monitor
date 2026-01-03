import type { Request, Response } from "express";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import * as db from "./db";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Get the API base URL for redirect
function getApiBaseUrl(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

// Get the frontend URL for redirect after login
function getFrontendUrl(req: Request): string {
  const apiUrl = getApiBaseUrl(req);
  // Replace 3000 port with 8081 for frontend
  return apiUrl.replace(/^(https?:\/\/)3000-/, "$18081-");
}

export function getGoogleAuthUrl(req: Request): string {
  const redirectUri = `${getApiBaseUrl(req)}/api/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleGoogleCallback(req: Request, res: Response) {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    const redirectUri = `${getApiBaseUrl(req)}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("[Google OAuth] Token exchange failed:", error);
      return res.status(400).json({ error: "Failed to exchange code for token" });
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      console.error("[Google OAuth] Failed to get user info");
      return res.status(400).json({ error: "Failed to get user info" });
    }

    const googleUser = await userInfoResponse.json();
    console.log("[Google OAuth] User info:", {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
    });

    // Use Google ID as openId
    const openId = `google_${googleUser.id}`;

    // Upsert user in database
    await db.upsertUser({
      openId,
      name: googleUser.name || null,
      email: googleUser.email || null,
      loginMethod: "google",
      lastSignedIn: new Date(),
    });

    console.log("[Google OAuth] User upserted with openId:", openId);

    // Create session token using SDK
    const sessionToken = await sdk.createSessionToken(openId, {
      name: googleUser.name || "",
    });

    // Set session cookie
    res.cookie("session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Redirect to frontend
    const frontendUrl = getFrontendUrl(req);
    console.log("[Google OAuth] Redirecting to:", frontendUrl);
    res.redirect(`${frontendUrl}/`);
  } catch (error) {
    console.error("[Google OAuth] Error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

// Login endpoint - redirects to Google
export function handleGoogleLogin(req: Request, res: Response) {
  const authUrl = getGoogleAuthUrl(req);
  console.log("[Google OAuth] Redirecting to Google:", authUrl);
  res.redirect(authUrl);
}
