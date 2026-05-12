import { NextResponse } from "next/server";
import {
  buildVisitorEventRecord,
  emailVisitorEvent,
  persistVisitorEvent,
  type VisitorEventType,
} from "@/app/lib/inquiry-intelligence";

type VisitorEventPayload = {
  sessionId?: unknown;
  type?: unknown;
  label?: unknown;
  path?: unknown;
};

const allowedEventTypes = new Set<VisitorEventType>([
  "resume-download",
  "linkedin-click",
]);

function isVisitorEventType(value: unknown): value is VisitorEventType {
  return typeof value === "string" && allowedEventTypes.has(value as VisitorEventType);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VisitorEventPayload;
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim().slice(0, 120) : "";
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) : "";
    const path = typeof body.path === "string" ? body.path.trim().slice(0, 200) : "/";

    if (!sessionId) {
      return NextResponse.json({ error: "A sessionId is required." }, { status: 400 });
    }

    if (!isVisitorEventType(body.type)) {
      return NextResponse.json({ error: "Unsupported visitor event type." }, { status: 400 });
    }

    const record = buildVisitorEventRecord({
      sessionId,
      type: body.type,
      label: label || body.type,
      path,
    });

    const [emailResult, persistResult] = await Promise.allSettled([
      emailVisitorEvent(record),
      persistVisitorEvent(record),
    ]);

    return NextResponse.json({
      emailed: emailResult.status === "fulfilled" ? emailResult.value.sent : false,
      saved: persistResult.status === "fulfilled" ? persistResult.value.saved : false,
      type: record.type,
      timestamp: record.timestamp,
    });
  } catch (error) {
    console.error("Visitor event capture error:", error);
    return NextResponse.json(
      { error: "Unable to capture visitor activity right now." },
      { status: 500 },
    );
  }
}
