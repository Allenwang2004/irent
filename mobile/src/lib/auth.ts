import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "./session";

// The proxy already redirects signed-out requests, but Server Functions are
// reachable by direct POST, so every action and data read checks again here.
export async function requireSession() {
  // The expiry check reads the clock, which must happen per request, not at prerender.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) redirect("/login");
}
