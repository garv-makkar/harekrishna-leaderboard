import { NextResponse } from "next/server";
import { deleteSignedInAccount } from "@/server/accountDeletion";

export async function POST(request: Request) {
  const result = await deleteSignedInAccount(request);
  return NextResponse.json(result.ok ? { ok: true } : { error: result.error }, { status: result.status });
}
