import { NextRequest, NextResponse } from "next/server";
import Env from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization");
    const body = await request.json();
    
    const response = await fetch(`${Env.BACKEND_URL}/api/organizations/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: 500, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
