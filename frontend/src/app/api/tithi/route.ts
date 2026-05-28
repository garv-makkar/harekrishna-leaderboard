import { NextResponse } from "next/server";
import { fetchTodayTithi } from "@/server/tithi";

export async function GET() {
  const payload = await fetchTodayTithi();
  return NextResponse.json(payload, { status: payload.ok ? 200 : 503 });
}
