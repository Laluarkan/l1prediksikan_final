import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const SYNC_SECRET = process.env.SYNC_SECRET_KEY || process.env.NEXTAUTH_SECRET || "Laluarkan123@";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, dan password wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    // Validasi format email dasar
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 }
      );
    }

    // Validasi kekuatan password
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password minimal harus 8 karakter." },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND_URL}/sync-user/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Secret": SYNC_SECRET,
      },
      body: JSON.stringify({
        username: cleanUsername,
        email: cleanEmail,
        password: password,
        name: cleanUsername,
        is_register: true,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.detail || "Pendaftaran gagal. Silakan coba lagi." },
        { status: res.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Akun berhasil didaftarkan!",
        user: {
          id: data.user_id,
          username: data.username,
          email: cleanEmail,
          is_staff: data.is_staff,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Tidak dapat terhubung ke server database. Periksa koneksi Anda." },
      { status: 500 }
    );
  }
}
