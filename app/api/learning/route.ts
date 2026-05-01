import { NextResponse } from "next/server";
import {
  buildInquiryRecord,
  emailInquirySummary,
  persistInquirySummary,
} from "@/app/lib/inquiry-intelligence";

type LearningPayload = {
  message?: unknown;
  reply?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LearningPayload;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const reply = typeof body.reply === "string" ? body.reply.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "A message is required for inquiry capture." },
        { status: 400 },
      );
    }

    const record = buildInquiryRecord(message, reply);

    const [emailResult, persistResult] = await Promise.allSettled([
      emailInquirySummary(record),
      persistInquirySummary(record),
    ]);

    return NextResponse.json({
      saved: persistResult.status === "fulfilled" ? persistResult.value.saved : false,
      emailed: emailResult.status === "fulfilled" ? emailResult.value.sent : false,
      category: record.category,
      audience: record.audience,
    });
  } catch (error) {
    console.error("Learning capture error:", error);
    return NextResponse.json(
      { error: "Unable to capture inquiry summary right now." },
      { status: 500 },
    );
  }
}
