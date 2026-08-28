/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
// Kunci sinkronisasi yang sama dengan di Django
const SYNC_SECRET = process.env.SYNC_SECRET_KEY as string;

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
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
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          (user as any).accessToken = data.access; 
        }
      } catch (error) {
        console.error("Gagal melakukan sinkronisasi user ke backend Django:", error);
      }
      return true; 
    },
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        try {
          const res = await fetch(`${BACKEND_URL}/check-staff/?email=${user.email}`, {
            headers: {
              "X-Sync-Secret": SYNC_SECRET,
            }
          });
          if (res.ok) {
            const data = await res.json();
            token.is_staff = data.is_staff;
          }
        } catch (e) {
          token.is_staff = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).is_staff = token.is_staff;
        (session as any).accessToken = token.accessToken; 
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };