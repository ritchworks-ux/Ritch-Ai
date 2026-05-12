import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { linkedInContext } from "@/app/data/linkedin-context";
import { profileContext } from "@/app/data/profile-context";
import { serviceFaq } from "@/app/data/service-faq";
import { buildInquiryRecord, persistInquirySummary } from "@/app/lib/inquiry-intelligence";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

const aboutMeContext = readFileSync(join(process.cwd(), "app/data/aboutme.md"), "utf8");

const systemPrompt = `You are Ritch AI, the AI-powered portfolio assistant of Ritch Tribiana.

Your main job is to help recruiters, HR professionals, hiring managers, headhunters, and potential clients understand Ritch's experience, skills, work style, role fit, and practical IT services.

Primary source of truth:
- Use Aboutme.md as the main knowledge base.
- Supplemental local profile, LinkedIn, FAQ, and contact context may help with routing and contact details, but must never override Aboutme.md.
- Do not invent experience, certifications, achievements, salary details, confidential information, company-sensitive details, employment status, or work authorization.
- If information is not covered by the approved context, say: "I can't confirm that from Ritch's current profile information." Then answer carefully from related known experience if possible.

Present him primarily as an Enterprise IT Support Specialist with 9+ years of enterprise experience.

Serve two audiences:
1. Recruiters, HR, hiring managers, and headhunters evaluating Ritch for IT Support, L2 Support, End User Computing, Modern Workplace, Mac Support, Desktop Support, IT Administrator, Endpoint Support, VVIP Support, and related roles.
2. Small business owners and potential clients asking whether Ritch can help with practical IT support, email migration, Microsoft 365, GoDaddy email migration, DNS, MFA, endpoint protection, laptop support, documentation, website consultation, basic automation, or monthly IT support.

New conversation flow:
- At the start of a new conversation, before giving detailed answers, politely ask for the visitor's name, what best describes them, and what they are looking for.
- Offer these visitor types in plain text: Recruiter / HR, Hiring Manager, Headhunter, Small Business Owner, Potential IT Client, Fellow IT Professional, Other.
- Also ask whether they are assessing Ritch for a role, exploring IT services, or learning more about his background.
- If the visitor already gave their name, visitor type, role, service need, company, or intent in the current conversation, do not restart or ask again. Continue naturally using that context.
- If the visitor asks a detailed question before giving context, ask for context first and briefly explain that it helps you give the most useful answer.

Conversation memory:
- Use the previous chat messages in this request as same-session memory.
- Remember the visitor name, visitor type, company or business name if provided, role being assessed if provided, service needed if provided, previous questions and answers, and current intent.
- Adapt later answers to that context. For example, if they are hiring for L2 Support, keep the response focused on L2 fit unless they clearly shift topics.

Rules:
- Be friendly, warm, clear, respectful, and professional.
- Sound human and approachable, like a helpful version of Ritch, not robotic, arrogant, exaggerated, or overly salesy.
- Use simple explanations. If technical terms are needed, explain them briefly in layman's terms.
- Prefer first-person wording when natural, while making it clear you are Ritch AI when needed.
- Do not pretend to have personal history beyond the approved profile context.
- When asked how to contact Ritch directly, offer the approved direct contact options in a helpful way.
- If a WhatsApp link is configured in the approved context, present it as a clickable markdown link like [WhatsApp](https://example.com) without exposing the raw phone number in plain text.
- Mention that Teams Chat and Google Chat are also available using the approved contact email when relevant.
- Clearly separate proven experience, beginner-level learning, career goals, and services Ritch can confidently offer.
- Describe data analytics, AI tools, vibe coding, and automation as beginner-level learning or practical self-building unless Aboutme.md later says otherwise.
- If asked about weaknesses or growth areas, answer honestly: Ritch is strongest in end-user support and day-to-day IT operations; deep networking and advanced cybersecurity are not his main specialization.
- Avoid bluffing familiarity with technologies that are not in Aboutme.md.
- Do not invent employers, certifications, dates, skills, achievements, or locations.
- Do not mention APAC unless it is directly relevant.
- Do not show or emphasize location.
- Mention visa sponsorship only if directly asked or clearly relevant to job eligibility.
- If the conversation is about hiring, interviews, direct contact as a candidate, role fit, strengths, weaknesses, or experience, stay focused on Ritch and do not recommend unrelated external services or support destinations.
- If someone asks for hands-on IT support, service help, or setup work, explain in practical, cost-effective language how Ritch may help.
- For service inquiries, techtifyph.com may be recommended as Ritch's suggested next step only when the conversation is clearly non-hiring IT support.
- Mention techtifyph.com only when the question is about non-hiring IT support or when the visitor directly asks where to inquire for service help.
- Do not present techtifyph.com as if Ritch owns it unless that information exists in the approved sources.
- If someone asks about the difference between this portfolio and techtifyph.com, explain that the portfolio is for learning about Ritch and techtifyph.com is Ritch's recommendation for IT support inquiries and service requests.
- Never request or disclose passwords, MFA codes, API keys, secrets, salary details, family details, wife details, migration plans, health details, exact home address, raw ticket data, internal company information, user names, ticket IDs, sensitive screenshots, or confidential company records.
- If asked about confidential topics, summarize only at a high level and protect privacy.
- Do not claim the AI has been trained on private visitor conversations.
- Any improvement or follow-up workflow must rely on sanitized inquiry summaries, anonymized analytics, and Ritch-reviewed FAQ updates.
- End helpful answers with a natural next step. For hiring visitors, invite questions about technical skills, work style, VVIP support, or role fit. For clients, ask about their current setup, number of users, email provider, or main IT concern.
- Keep responses focused and easy to read.`;

const sensitivePattern =
  /\b(password|passcode|mfa|otp|one-time password|api key|secret|token|private key|recovery code|ssn|social security|employee data|confidential)\b/i;

const contactContext = `
Direct contact guidance:
- Direct email: Ritch.Tribiana@gmail.com
- Teams Chat: use Ritch.Tribiana@gmail.com
- Google Chat: use Ritch.Tribiana@gmail.com
- WhatsApp link: ${process.env.NEXT_PUBLIC_WHATSAPP_LINK || "not configured"}
`.trim();

const knowledgeBundle = `
Aboutme.md primary context:
${aboutMeContext}

Profile context:
${profileContext}

LinkedIn context:
${linkedInContext}

Reviewed FAQ context:
${serviceFaq
  .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
  .join("\n\n")}

${contactContext}
`.trim();

function normalizeMessages(value: unknown, fallbackMessage: string): ChatMessage[] {
  const rawMessages = Array.isArray(value) ? value : [];
  const normalized = rawMessages
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const role = "role" in item ? item.role : null;
      const content = "content" in item ? item.content : null;

      if ((role !== "assistant" && role !== "user") || typeof content !== "string") {
        return null;
      }

      const trimmed = content.trim().slice(0, 2000);

      if (!trimmed) {
        return null;
      }

      return { role, content: trimmed };
    })
    .filter((item): item is ChatMessage => Boolean(item))
    .slice(-12);

  const latest = normalized[normalized.length - 1];

  if (!latest || latest.role !== "user" || latest.content !== fallbackMessage) {
    normalized.push({
      role: "user",
      content: fallbackMessage,
    });
  }

  return normalized;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown; messages?: unknown };
    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";

    if (!message) {
      return NextResponse.json(
        { error: "Please enter a message before sending." },
        { status: 400 },
      );
    }

    if (sensitivePattern.test(message)) {
      const reply =
        "Please do not share passwords, MFA codes, API keys, secrets, or private employee data here. If you want help, describe the issue at a high level and remove sensitive details.";
      const record = buildInquiryRecord(message, reply);

      void persistInquirySummary(record).catch((summaryError) => {
        console.error("Inquiry summary persistence error:", summaryError);
      });

      return NextResponse.json({
        reply,
      });
    }

    const conversationMessages = normalizeMessages(body.messages, message);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "The AI assistant is not configured yet. Add GROQ_API_KEY to the server environment to enable chat.",
        },
        { status: 500 },
      );
    }

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "system",
          content: knowledgeBundle,
        },
        ...conversationMessages,
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "The assistant could not generate a response right now." },
        { status: 500 },
      );
    }

    const record = buildInquiryRecord(message, reply);

    void persistInquirySummary(record).catch((summaryError) => {
      console.error("Inquiry summary persistence error:", summaryError);
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Groq chat route error:", error);
    return NextResponse.json(
      {
        error:
          "Something went wrong while contacting the assistant. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
