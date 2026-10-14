import NextAuth from "next-auth";
import { authOptions, isAuthConfigured } from "@/lib/auth";

const handler = NextAuth(authOptions);
const unavailable = () => Response.json({ error: "Sign-in is not configured. Set GITHUB_ID, GITHUB_SECRET and NEXTAUTH_SECRET in your local environment." }, { status: 503 });
export async function GET(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  if (!isAuthConfigured()) return unavailable();
  return handler(request, context);
}
export async function POST(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  if (!isAuthConfigured()) return unavailable();
  return handler(request, context);
}
