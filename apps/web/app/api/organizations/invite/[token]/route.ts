import { NextRequest, NextResponse } from "next/server";
import Env from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    const response = await fetch(`${Env.BACKEND_URL}/api/organizations/invite/${token}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
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
