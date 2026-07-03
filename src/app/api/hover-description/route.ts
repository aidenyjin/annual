import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateHoverDescription } from "@/lib/ai/groq";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { heading, context } = await request.json();
  if (!heading || typeof heading !== "string") {
    return NextResponse.json({ error: "heading is required" }, { status: 400 });
  }

  try {
    const description = await generateHoverDescription(heading, context);
    return NextResponse.json({ description });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
