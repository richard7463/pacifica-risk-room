import { NextResponse } from "next/server";
import { PACIFICA_ACCOUNT_HEALTH_SKILL } from "@/lib/skillContent";

export const dynamic = "force-static";

export function GET() {
  return new NextResponse(PACIFICA_ACCOUNT_HEALTH_SKILL, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
