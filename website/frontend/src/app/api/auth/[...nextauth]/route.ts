/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

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
        await fetch(`${BACKEND_URL}/sync-user/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
          }),
        });
      } catch (error) {
        console.error("Gagal melakukan sinkronisasi user ke backend Django:", error);
      }
      return true; 
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          const res = await fetch(`${BACKEND_URL}/check-staff/?email=${user.email}`);
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
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };