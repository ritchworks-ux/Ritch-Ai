import nodemailer from "nodemailer";

export type InquiryAudience = "hiring" | "it-support" | "general";

export type InquiryRecord = {
  category: string;
  audience: InquiryAudience;
  sanitizedMessage: string;
  sanitizedReply: string;
  timestamp: string;
  source: "portfolio-chat";
  recommendation: string;
  note: string;
};

export type SessionSummaryMessage = {
  role: "assistant" | "user";
  content: string;
};

export type SessionSummaryRecord = {
  sessionId: string;
  trigger: "idle" | "pagehide" | "manual-reset";
  category: string;
  audience: InquiryAudience;
  userMessageCount: number;
  assistantMessageCount: number;
  sanitizedTranscript: string[];
  timestamp: string;
  source: "portfolio-chat";
  recommendation: string;
  learningSources: { topic: string; label: string; url: string }[];
  note: string;
};

type LearningSource = {
  topic: string;
  label: string;
  url: string;
  matcher: RegExp;
};

const learningSourceCatalog: LearningSource[] = [
  {
    topic: "AWS",
    label: "AWS Training and Certification",
    url: "https://aws.amazon.com/training/",
    matcher: /\baws\b|amazon web services|cloud practitioner|ec2|s3|iam\b/i,
  },
  {
    topic: "Microsoft 365 and Intune",
    label: "Microsoft Learn Training",
    url: "https://learn.microsoft.com/en-us/training/",
    matcher: /\bmicrosoft 365\b|office 365|intune|entra|azure ad|teams|sharepoint|outlook/i,
  },
  {
    topic: "ServiceNow",
    label: "ServiceNow Training and Certification",
    url: "https://www.servicenow.com/training.html",
    matcher: /\bservicenow\b|itsm|itil|sla\b/i,
  },
  {
    topic: "Okta",
    label: "Okta Developer and Product Docs",
    url: "https://developer.okta.com/docs/guides/set-up-org/main/",
    matcher: /\bokta\b|identity lifecycle|sso|mfa|provisioning/i,
  },
  {
    topic: "Jamf",
    label: "Jamf Training",
    url: "https://www.jamf.com/training/",
    matcher: /\bjamf\b|macos management|apple device management/i,
  },
];

const sensitivePattern =
  /\b(password|passcode|mfa|otp|one-time password|api key|secret|token|private key|recovery code|ssn|social security|employee data|confidential)\b/gi;

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/g;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeText(message: string, maxLength = 500) {
  return collapseWhitespace(
    message
      .replace(emailPattern, "[redacted-email]")
      .replace(phonePattern, "[redacted-phone]")
      .replace(sensitivePattern, "[redacted-sensitive-term]"),
  ).slice(0, maxLength);
}

export function categorizeInquiry(message: string) {
  const lower = message.toLowerCase();

  if (/(hire|hiring|manager|candidate|resume|experience|background|interview|role)/.test(lower)) {
    return { category: "hiring-evaluation", audience: "hiring" as const };
  }

  if (/(domain|dns|email setup|google workspace|workspace|microsoft 365|office 365|outlook|teams|sharepoint)/.test(lower)) {
    return { category: "business-productivity-support", audience: "it-support" as const };
  }

  if (/(onboarding|offboarding|joiner|mover|leaver|access)/.test(lower)) {
    return { category: "identity-lifecycle", audience: "it-support" as const };
  }

  if (/(laptop|device|endpoint|intune|jamf|sccm|enrollment)/.test(lower)) {
    return { category: "endpoint-support", audience: "it-support" as const };
  }

  if (/(security|bitlocker|filevault|vulnerability|compliance)/.test(lower)) {
    return { category: "security-hygiene", audience: "it-support" as const };
  }

  if (/(small business|messy it|process|workflow|documentation|health check)/.test(lower)) {
    return { category: "small-business-it", audience: "it-support" as const };
  }

  return { category: "general-inquiry", audience: "general" as const };
}

export function buildInquiryRecord(message: string, reply: string): InquiryRecord {
  const sanitizedMessage = sanitizeText(message, 700);
  const sanitizedReply = sanitizeText(reply, 700);
  const { category, audience } = categorizeInquiry(sanitizedMessage);

  const recommendation =
    audience === "it-support"
      ? "Recommend techtifyph.com as Ritch's suggested path for service inquiries."
      : audience === "hiring"
        ? "Treat as a hiring-related conversation about Ritch's background."
        : "Treat as a general portfolio inquiry and clarify whether it is hiring-related or service-related.";

  return {
    category,
    audience,
    sanitizedMessage,
    sanitizedReply,
    timestamp: new Date().toISOString(),
    source: "portfolio-chat",
    recommendation,
    note: "Sanitized inquiry summary for follow-up and FAQ/training review.",
  };
}

function buildEmailText(record: InquiryRecord) {
  return [
    "New portfolio inquiry summary",
    "",
    `Timestamp: ${record.timestamp}`,
    `Audience: ${record.audience}`,
    `Category: ${record.category}`,
    `Source: ${record.source}`,
    "",
    "Visitor inquiry summary:",
    record.sanitizedMessage || "No message captured.",
    "",
    "Assistant response summary:",
    record.sanitizedReply || "No assistant reply captured.",
    "",
    "Recommended next step:",
    record.recommendation,
    "",
    "Note:",
    record.note,
  ].join("\n");
}

function buildSessionEmailText(record: SessionSummaryRecord) {
  const guidance = buildInterviewGuidance(record);
  const learningSources = buildLearningSourcesSection(record);

  return [
    "New Ritch AI session summary",
    "",
    "Here is a conversational recap of the session:",
    "",
    `The conversation was categorized as ${record.category} for a ${record.audience} audience.`,
    `It ended because of: ${record.trigger}.`,
    `There were ${record.userMessageCount} visitor message(s) and ${record.assistantMessageCount} assistant message(s).`,
    "",
    "Conversation snapshot:",
    ...record.sanitizedTranscript,
    "",
    "Suggested next step:",
    record.recommendation,
    "",
    "How Ritch can answer in the actual interview or follow-up:",
    ...guidance,
    "",
    "Suggested study sources based on this conversation:",
    ...learningSources,
    "",
    "Reference details:",
    `Timestamp: ${record.timestamp}`,
    `Session ID: ${record.sessionId}`,
    `Source: ${record.source}`,
    "",
    "Note:",
    record.note,
  ].join("\n");
}

function buildLearningSourcesSection(record: SessionSummaryRecord) {
  if (record.learningSources.length === 0) {
    return [
      "- Review the job description closely and start with the official documentation or training portal of the main tools mentioned.",
      "- Focus first on the technologies most directly tied to the role so the learning effort stays practical.",
    ];
  }

  return record.learningSources.map(
    (source) => `- ${source.topic}: ${source.label} - ${source.url}`,
  );
}

function buildInterviewGuidance(record: SessionSummaryRecord) {
  if (record.audience === "hiring") {
    return [
      "- Lead with the core story: 9+ years in enterprise IT support across end-user support, Microsoft 365, endpoint tooling, identity workflows, and operational coordination.",
      "- Mirror the visitor's language and connect it back to real day-to-day support impact, ownership, and user experience.",
      "- If they are testing depth, be specific about tools and workflows you have used instead of sounding too broad.",
      "- If they ask about weaknesses, explain honestly that deep networking and advanced cybersecurity are not your main specialization, then pivot to how quickly you learn and collaborate.",
    ];
  }

  if (record.audience === "it-support") {
    return [
      "- Start by clarifying the business need in plain language and keep the explanation practical.",
      "- Show that you understand day-to-day support operations, onboarding, Microsoft 365, device readiness, and access workflows.",
      "- If the request becomes hands-on service work, recommend techtifyph.com as the next step without overexplaining.",
      "- If something goes beyond your strongest area, be honest, explain what you can still support operationally, and show how you would coordinate or learn fast.",
    ];
  }

  return [
    "- Start by clarifying whether the person is asking from a hiring perspective or a support perspective.",
    "- Keep the answer warm, direct, and grounded in real examples from enterprise IT support.",
    "- If the topic turns specialized, be honest about what you know well and what you would validate or learn further.",
    "- End with a clear next step so the conversation keeps moving.",
  ];
}

export async function emailInquirySummary(record: InquiryRecord) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SUMMARY_EMAIL_FROM || user;
  const to = process.env.SUMMARY_EMAIL_TO || "ritch.tribiana@gmail.com";

  if (!host || !user || !pass || !from || !to) {
    console.info("Inquiry email skipped: SMTP settings not configured.", {
      category: record.category,
      audience: record.audience,
    });
    return { sent: false, reason: "smtp_not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject: `[Portfolio Inquiry] ${record.audience} | ${record.category}`,
    text: buildEmailText(record),
  });

  return { sent: true as const };
}

export function buildSessionSummaryRecord({
  sessionId,
  trigger,
  messages,
}: {
  sessionId: string;
  trigger: "idle" | "pagehide" | "manual-reset";
  messages: SessionSummaryMessage[];
}): SessionSummaryRecord {
  const relevantMessages = messages.filter((message) => collapseWhitespace(message.content).length > 0);
  const userMessages = relevantMessages.filter((message) => message.role === "user");
  const assistantMessages = relevantMessages.filter((message) => message.role === "assistant");
  const combinedUserText = userMessages.map((message) => message.content).join(" ");
  const { category, audience } = categorizeInquiry(combinedUserText);

  const sanitizedTranscript = relevantMessages
    .slice(-10)
    .map((message) => `${message.role === "user" ? "Visitor" : "Ritch AI"}: ${sanitizeText(message.content, 280)}`);

  const recommendation =
    audience === "it-support"
      ? "Follow up on the support need and, when relevant, recommend techtifyph.com as Ritch's suggested path."
      : audience === "hiring"
        ? "Use this summary to prepare for a hiring or interview follow-up."
        : "Review the summary and clarify whether the session was hiring-related or support-related.";
  const learningSources = collectLearningSources(
    relevantMessages.map((message) => message.content).join(" "),
  );

  return {
    sessionId,
    trigger,
    category,
    audience,
    userMessageCount: userMessages.length,
    assistantMessageCount: assistantMessages.length,
    sanitizedTranscript,
    timestamp: new Date().toISOString(),
    source: "portfolio-chat",
    recommendation,
    learningSources,
    note: "Sanitized session summary for follow-up and assistant-improvement review.",
  };
}

function collectLearningSources(text: string) {
  const seen = new Set<string>();
  const matches: { topic: string; label: string; url: string }[] = [];

  for (const source of learningSourceCatalog) {
    if (source.matcher.test(text) && !seen.has(source.topic)) {
      seen.add(source.topic);
      matches.push({
        topic: source.topic,
        label: source.label,
        url: source.url,
      });
    }
  }

  return matches;
}

export async function emailSessionSummary(record: SessionSummaryRecord) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SUMMARY_EMAIL_FROM || user;
  const to = process.env.SUMMARY_EMAIL_TO || "ritch.tribiana@gmail.com";

  if (!host || !user || !pass || !from || !to) {
    console.info("Session summary email skipped: SMTP settings not configured.", {
      category: record.category,
      audience: record.audience,
      sessionId: record.sessionId,
    });
    return { sent: false, reason: "smtp_not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject: `[Ritch AI Session] ${record.audience} | ${record.category} | ${record.trigger}`,
    text: buildSessionEmailText(record),
  });

  return { sent: true as const };
}

export async function persistInquirySummary(record: InquiryRecord) {
  const webhookUrl = process.env.LEARNING_WEBHOOK_URL;

  if (!webhookUrl) {
    return { saved: false, reason: "webhook_not_configured" as const };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    throw new Error(`Learning webhook rejected payload with status ${response.status}`);
  }

  return { saved: true as const };
}

export async function persistSessionSummary(record: SessionSummaryRecord) {
  const webhookUrl = process.env.LEARNING_WEBHOOK_URL;

  if (!webhookUrl) {
    return { saved: false, reason: "webhook_not_configured" as const };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "session-summary",
      ...record,
    }),
  });

  if (!response.ok) {
    throw new Error(`Learning webhook rejected session payload with status ${response.status}`);
  }

  return { saved: true as const };
}
