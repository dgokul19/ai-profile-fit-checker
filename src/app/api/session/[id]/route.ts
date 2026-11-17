import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/session-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessionStore.get(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  sessionStore.delete(id);
  return new NextResponse(null, { status: 204 });
}
