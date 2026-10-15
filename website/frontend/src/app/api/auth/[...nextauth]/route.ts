/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
// Kunci sinkronisasi server-to-server yang sama dengan Django
const SYNC_SECRET = process.env.SYNC_SECRET_KEY || process.env.NEXTAUTH_SECRET || "Laluarkan123@";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi.");
        }

        const cleanEmail = credentials.email.trim().toLowerCase();

        try {
          const res = await fetch(`${BACKEND_URL}/sync-user/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Sync-Secret": SYNC_SECRET,
            },
            body: JSON.stringify({
              email: cleanEmail,
              password: credentials.password,
              name: cleanEmail.split("@")[0],
              username: cleanEmail.split("@")[0],
              is_register: false,
              is_google: false,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || data.detail || "Email atau password salah.");
          }

          return {
            id: String(data.user_id),
            name: data.username,
            email: cleanEmail,
            accessToken: data.access,
            refreshToken: data.refresh,
            is_staff: Boolean(data.is_staff),
            image: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username)}&background=059669&color=fff&bold=true`,
          };
        } catch (error: any) {
          throw new Error(error.message || "Gagal menghubungi server database.");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "Laluarkan123@",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const res = await fetch(`${BACKEND_URL}/sync-user/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Sync-Secret": SYNC_SECRET,
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              is_google: true,
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            (user as any).accessToken = data.access; 
            (user as any).is_staff = data.is_staff;
            (user as any).id = String(data.user_id);
            (user as any).provider = "google";
          }
        } catch (error) {
          console.error("Gagal sinkronisasi user Google ke backend Django:", error);
        }
      }
      return true; 
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.is_staff = (user as any).is_staff;
        token.userId = (user as any).id;
        token.provider = account?.provider || (user as any).provider || "email";
        if (user.image) {
          token.picture = user.image;
        }

        // Cek is_staff bila belum diset
        if (token.is_staff === undefined && user.email) {
          try {
            const res = await fetch(`${BACKEND_URL}/check-staff/?email=${encodeURIComponent(user.email)}`, {
              headers: {
                "X-Sync-Secret": SYNC_SECRET,
              },
            });
            if (res.ok) {
              const data = await res.json();
              token.is_staff = data.is_staff;
            }
          } catch (e) {
            token.is_staff = false;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).is_staff = token.is_staff;
        (session.user as any).provider = token.provider;
        (session as any).accessToken = token.accessToken; 
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };