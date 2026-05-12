import { NextResponse } from "next/server";
import {
  buildSessionSummaryRecord,
  emailSessionSummary,
  persistSessionSummary,
  type VisitorEvent,
  type VisitorEventType,
} from "@/app/lib/inquiry-intelligence";

type SessionSummaryPayload = {
  sessionId?: unknown;
  trigger?: unknown;
  messages?: unknown;
  events?: unknown;
};

type SessionSummaryMessage = {
  role: "assistant" | "user";
  content: string;
};

const allowedEventTypes = new Set<VisitorEventType>([
  "resume-download",
  "linkedin-click",
]);

function isMessage(value: unknown): value is SessionSummaryMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { role?: unknown; content?: unknown };
  return (
    (candidate.role === "assistant" || candidate.role === "user") &&
    typeof candidate.content === "string"
  );
}

function isVisitorEvent(value: unknown): value is VisitorEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    type?: unknown;
    label?: unknown;
    path?: unknown;
    timestamp?: unknown;
  };

  return (
    typeof candidate.type === "string" &&
    allowedEventTypes.has(candidate.type as VisitorEventType) &&
    typeof candidate.label === "string" &&
    typeof candidate.path === "string" &&
    typeof candidate.timestamp === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SessionSummaryPayload;
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim().slice(0, 120) : "";
    const trigger =
      body.trigger === "idle" || body.trigger === "pagehide" || body.trigger === "manual-reset"
        ? body.trigger
        : "pagehide";
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isMessage).map((message) => ({
          role: message.role,
          content: message.content.trim().slice(0, 4000),
        }))
      : [];
    const events = Array.isArray(body.events)
      ? body.events.filter(isVisitorEvent).map((event) => ({
          type: event.type,
          label: event.label.trim().slice(0, 120),
          path: event.path.trim().slice(0, 200),
          timestamp: event.timestamp.trim().slice(0, 80),
        }))
      : [];

    if (!sessionId) {
      return NextResponse.json({ error: "A sessionId is required." }, { status: 400 });
    }

    if (messages.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no_messages" });
    }

    const meaningfulUserMessages = messages.filter(
      (message) => message.role === "user" && message.content.length > 0,
    );

    if (meaningfulUserMessages.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no_user_messages" });
    }

    const record = buildSessionSummaryRecord({
      sessionId,
      trigger,
      messages,
      events,
    });

    const [emailResult, persistResult] = await Promise.allSettled([
      emailSessionSummary(record),
      persistSessionSummary(record),
    ]);

    return NextResponse.json({
      emailed: emailResult.status === "fulfilled" ? emailResult.value.sent : false,
      saved: persistResult.status === "fulfilled" ? persistResult.value.saved : false,
      category: record.category,
      audience: record.audience,
      trigger: record.trigger,
    });
  } catch (error) {
    console.error("Session summary capture error:", error);
    return NextResponse.json(
      { error: "Unable to capture the session summary right now." },
      { status: 500 },
    );
  }
}
