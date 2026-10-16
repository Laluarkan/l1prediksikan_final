import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const SYNC_SECRET = process.env.SYNC_SECRET_KEY || process.env.NEXTAUTH_SECRET || "Laluarkan123@";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ exists: false });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/check-email/?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "X-Sync-Secret": SYNC_SECRET,
        "X-App-Client-Key": SYNC_SECRET,
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ exists: data.exists === true });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Gagal memeriksa email via backend:", error);
    return NextResponse.json({ exists: false });
  }
}
