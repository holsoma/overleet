import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { getDb } from "./db";
import type { Viewer } from "./contracts";

export function isAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET && process.env.NEXTAUTH_SECRET);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: isAuthConfigured() ? [GitHubProvider({
    clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET!,
    authorization: { params: { scope: "read:user" } },
  })] : [],
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider === "github") {
        const saved = await getDb().user.upsert({
          where: { githubId: account.providerAccountId },
          create: { githubId: account.providerAccountId, name: user.name, image: user.image },
          update: { name: user.name, image: user.image },
        });
        token.userId = saved.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") session.user.id = token.userId;
      return session;
    },
  },
  logger: {
    error() { console.error("Authentication failed. Check local OAuth and database configuration."); },
    warn() { console.warn("Authentication configuration needs attention."); },
    debug() {},
  },
};

export async function getViewer(): Promise<Viewer | null> {
  if (!isAuthConfigured()) return null;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return { id: session.user.id, name: session.user.name ?? null, image: session.user.image ?? null };
}
