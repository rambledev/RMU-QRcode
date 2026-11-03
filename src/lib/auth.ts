import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const ALLOWED_EMAIL_DOMAIN = "rmu.ac.th";

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          // Hint Google to only show accounts of this Workspace domain.
          // This is UX only — the real check is in the signIn callback below.
          hd: ALLOWED_EMAIL_DOMAIN,
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async signIn({ account, profile }) {
      const email = profile?.email;
      const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      const hostedDomain = (profile as { hd?: string } | undefined)?.hd;
      console.log("[Auth][signIn] START", { provider: account?.provider, email, emailVerified, hostedDomain });

      if (account?.provider !== "google") {
        console.log("[Auth][signIn] END rejected: unsupported provider", { provider: account?.provider });
        return false;
      }

      const allowed = emailVerified === true && hostedDomain === ALLOWED_EMAIL_DOMAIN && isAllowedEmail(email);
      console.log("[Auth][signIn] END", { email, allowed });
      // Returning a URL redirects to the login page with a friendly error code
      return allowed ? true : "/?error=DomainNotAllowed";
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email.toLowerCase();
        token.name = profile.name ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }
      return session;
    },
  },
};

/**
 * Returns the verified @rmu.ac.th email of the current request, or null.
 * Use this in API routes instead of trusting email/userId from the client.
 */
export async function getSessionEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!isAllowedEmail(email)) {
    console.log("[Auth][getSessionEmail] no valid session", { email });
    return null;
  }
  return email!.toLowerCase();
}
