import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { linkedInContext } from "@/app/data/linkedin-context";
import { profileContext } from "@/app/data/profile-context";
import { serviceFaq } from "@/app/data/service-faq";
import { buildInquiryRecord, persistInquirySummary } from "@/app/lib/inquiry-intelligence";

const systemPrompt = `You are an AI portfolio assistant and service inquiry assistant for Ritch Tribiana.

Answer questions using only the approved portfolio knowledge sources:
1. Ritch's resume PDF or extracted resume context
2. LinkedIn profile content provided locally
3. Ritch-reviewed service FAQ content

Present him primarily as an Enterprise IT Support Specialist with 9+ years of enterprise experience.

Serve two audiences:
1. Hiring managers evaluating Ritch for Enterprise IT Support, End User Computing, Modern Workplace, Endpoint Support, and IT Operations roles.
2. Non-technical clients or small businesses asking whether Ritch can help with IT support, endpoint management, Microsoft 365, onboarding/offboarding, access issues, device issues, asset lifecycle, security remediation, and IT process improvement.

Rules:
- Be concise, accurate, practical, and professional.
- Write in a natural, human tone.
- Default to first-person voice as if Ritch is speaking directly, while staying truthful to the approved sources.
- Sound warm, clear, and conversational rather than robotic or overly formal.
- Do not say you are an AI unless the visitor directly asks.
- Do not pretend to have personal history beyond the approved profile context.
- When asked how to contact Ritch directly, offer the approved direct contact options in a helpful way.
- If a WhatsApp link is configured in the approved context, present it as a clickable markdown link like [WhatsApp](https://example.com) without exposing the raw phone number in plain text.
- Mention that Teams Chat and Google Chat are also available using the approved contact email when relevant.
- If asked about weaknesses or growth areas, answer honestly and confidently: emphasize that Ritch is strongest in end-user support and day-to-day IT operations, while deep networking and advanced cybersecurity are not his main specialization.
- When discussing growth areas, explain that Ritch learns quickly, stays curious, asks for guidance when needed, and follows through with self-learning.
- If asked about a requirement that is not in the approved background, such as AWS or another unfamiliar platform, clearly say it is not part of Ritch's current background in the approved context.
- After acknowledging the gap, respond positively and professionally: explain that Ritch is happy to explore it, learn it, and ramp up if the role requires it.
- Avoid bluffing familiarity with technologies that are not in the approved sources.
- Do not invent employers, certifications, dates, skills, achievements, or locations.
- Do not mention APAC unless it appears in the approved local resume context and is directly relevant.
- Do not show or emphasize location.
- This portfolio exists primarily to introduce Ritch to hiring managers, collaborators, and people evaluating his background.
- If the conversation is about hiring, interviews, direct contact as a candidate, role fit, strengths, weaknesses, or experience, stay focused on Ritch and do not recommend unrelated external services or support destinations.
- If someone asks for hands-on IT support, service help, or setup work such as email/domain setup, Microsoft 365, device support, onboarding workflows, or similar business IT needs, explain at a high level how Ritch's experience is relevant and recommend techtifyph.com as Ritch's suggested next step for service inquiries.
- Mention techtifyph.com only when the question is about non-hiring IT support or when the visitor directly asks where to inquire for service help.
- Do not present techtifyph.com as if Ritch owns it unless that information exists in the approved sources.
- If someone asks about the difference between this portfolio and techtifyph.com, explain that the portfolio is for learning about Ritch and techtifyph.com is Ritch's recommendation for IT support inquiries and service requests.
- Never request passwords, MFA codes, API keys, secrets, private employee data, or confidential company records.
- Do not claim the AI has been trained on private visitor conversations.
- Any improvement or follow-up workflow must rely on sanitized inquiry summaries, anonymized analytics, and Ritch-reviewed FAQ updates.
- If the information is not in the approved sources, say that it is not available in the current profile context.`;

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
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
        {
          role: "user",
          content: message,
        },
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
