"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type IconName =
  | "search"
  | "send"
  | "bot"
  | "mail"
  | "linkedin"
  | "file"
  | "sparkles"
  | "moon"
  | "sun"
  | "reset"
  | "copy"
  | "check";

const SESSION_IDLE_MS = 2 * 60 * 1000;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const initialAssistantMessage: Message = {
  id: "assistant-initial",
  role: "assistant",
  content:
    "Hi, I'm here to help you learn more about Ritch. You can ask about his background for hiring, or share the kind of IT support you need and I'll point you to the right next step.",
};

const suggestedPrompts = [
  "Why should a hiring manager consider Ritch?",
  "What Enterprise IT Support experience does Ritch have?",
  "We need help setting up email and domain. Where should we inquire?",
  "How can Ritch support a hiring conversation?",
];

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const icons = {
    search: (
      <svg {...commonProps}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
    send: (
      <svg {...commonProps}>
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4Z" />
      </svg>
    ),
    bot: (
      <svg {...commonProps}>
        <path d="M12 8V4" />
        <rect x="5" y="8" width="14" height="11" rx="3" />
        <path d="M9 13h.01" />
        <path d="M15 13h.01" />
        <path d="M9 17h6" />
      </svg>
    ),
    mail: (
      <svg {...commonProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
    linkedin: (
      <svg {...commonProps}>
        <path d="M16 8a6 6 0 0 1 6 6v6h-4v-6a2 2 0 0 0-4 0v6h-4v-12h4v2" />
        <rect x="2" y="9" width="4" height="11" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    file: (
      <svg {...commonProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    ),
    sparkles: (
      <svg {...commonProps}>
        <path d="M12 3 10 9l-6 2 6 2 2 6 2-6 6-2-6-2-2-6Z" />
      </svg>
    ),
    moon: (
      <svg {...commonProps}>
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    ),
    sun: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    ),
    reset: (
      <svg {...commonProps}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 3v6h6" />
      </svg>
    ),
    copy: (
      <svg {...commonProps}>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <rect x="2" y="2" width="13" height="13" rx="2" />
      </svg>
    ),
    check: (
      <svg {...commonProps}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    ),
  };

  return icons[name];
}

function validateMessage(message: string) {
  return message.trim().length > 0;
}

function renderMessageContent(content: string) {
  const elements: React.ReactNode[] = [];
  const markdownMatches = Array.from(content.matchAll(MARKDOWN_LINK_PATTERN));
  let cursor = 0;

  const pushPlainText = (text: string, keyPrefix: string) => {
    if (!text) {
      return;
    }

    const lines = text.split("\n");

    lines.forEach((line, lineIndex) => {
      const parts = line.split(URL_PATTERN);

      parts.forEach((part, partIndex) => {
        const emailMatch = part.match(EMAIL_PATTERN);
        const isUrl = /^https?:\/\//.test(part);

        if (isUrl) {
          elements.push(
            <a
              key={`${keyPrefix}-url-${lineIndex}-${partIndex}`}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-current/40 underline-offset-4 transition hover:opacity-80"
            >
              {part}
            </a>,
          );
          return;
        }

        if (emailMatch && emailMatch[0] === part) {
          elements.push(
            <a
              key={`${keyPrefix}-email-${lineIndex}-${partIndex}`}
              href={`mailto:${part}`}
              className="underline decoration-current/40 underline-offset-4 transition hover:opacity-80"
            >
              {part}
            </a>,
          );
          return;
        }

        if (part) {
          elements.push(
            <span key={`${keyPrefix}-text-${lineIndex}-${partIndex}`}>{part}</span>,
          );
        }
      });

      if (lineIndex < lines.length - 1) {
        elements.push(<br key={`${keyPrefix}-br-${lineIndex}`} />);
      }
    });
  };

  markdownMatches.forEach((match, index) => {
    const start = match.index ?? 0;
    const [fullMatch, label, href] = match;
    pushPlainText(content.slice(cursor, start), `before-${index}`);
    elements.push(
      <a
        key={`md-link-${index}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-current/40 underline-offset-4 transition hover:opacity-80"
      >
        {label}
      </a>,
    );
    cursor = start + fullMatch.length;
  });

  pushPlainText(content.slice(cursor), "tail");

  return elements;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage]);
  const [error, setError] = useState("");
  const [isTypingResponse, setIsTypingResponse] = useState(false);
  const activeRequestRef = useRef(0);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);
  const latestMessagesRef = useRef<Message[]>([initialAssistantMessage]);
  const sessionIdRef = useRef(createSessionId());
  const summarySentRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const current = document.documentElement.classList.contains("dark");
    setIsDark(current);
  }, []);

  useEffect(() => {
    const viewport = chatViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, error]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const sendSessionSummary = (trigger: "idle" | "pagehide") => {
      if (summarySentRef.current) {
        return;
      }

      const sessionMessages = latestMessagesRef.current
        .filter((message) => message.id !== initialAssistantMessage.id)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const hasUserMessages = sessionMessages.some((message) => message.role === "user");

      if (!hasUserMessages) {
        return;
      }

      summarySentRef.current = true;

      const payload = JSON.stringify({
        sessionId: sessionIdRef.current,
        trigger,
        messages: sessionMessages,
      });

      if (trigger === "pagehide" && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/session-summary", blob);
        return;
      }

      void fetch("/api/session-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
      }).catch(() => {
        summarySentRef.current = false;
      });
    };

    const scheduleIdleSummary = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = window.setTimeout(() => {
        sendSessionSummary("idle");
      }, SESSION_IDLE_MS);
    };

    const handleActivity = () => {
      scheduleIdleSummary();
    };

    const handlePageHide = () => {
      sendSessionSummary("pagehide");
    };

    scheduleIdleSummary();

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }

      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  const showSuggestedPrompts =
    messages.length === 1 && messages[0]?.id === initialAssistantMessage.id && !isLoading;

  const theme = useMemo(() => {
    if (isDark) {
      return {
        page: "bg-[#0f0f10] text-[#f7f3ea]",
        glowOne: "bg-[#2b2b2f]/80",
        glowTwo: "bg-[#3b3225]/50",
        header: "border-white/10 bg-white/8 text-[#f7f3ea]",
        muted: "text-[#b8afa4]",
        softMuted: "text-[#8f867b]",
        chip: "border-white/10 bg-white/8 text-[#d7cfc5] hover:bg-white/12",
        card: "border-white/10 bg-[#18181a]/86 shadow-2xl",
        panel: "bg-[#101012]",
        assistantBubble: "border-white/10 bg-white/8 text-[#eee6dc]",
        userBubble: "bg-[#f7f3ea] text-[#171412]",
        input: "border-white/10 bg-white/8 text-[#f7f3ea] placeholder:text-[#8f867b]",
        button: "bg-[#f7f3ea] text-[#171412] hover:bg-white",
        iconPanel: "bg-[#f7f3ea] text-[#171412]",
        status: "bg-emerald-400/15 text-emerald-200",
        danger: "border-red-400/20 bg-red-400/10 text-red-100",
      };
    }

    return {
      page: "bg-[#f8f5ef] text-[#171412]",
      glowOne: "bg-white/80",
      glowTwo: "bg-[#e9dfd0]/80",
      header: "border-black/10 bg-white/70 text-[#171412]",
      muted: "text-[#5f574f]",
      softMuted: "text-[#756d64]",
      chip: "border-black/10 bg-[#f8f5ef] text-[#5f574f] hover:bg-white",
      card: "border-black/10 bg-white/75 shadow-2xl",
      panel: "bg-[#f8f5ef]",
      assistantBubble: "border-black/10 bg-white text-[#4d463f]",
      userBubble: "bg-[#171412] text-white",
      input: "border-black/10 bg-white text-[#171412] placeholder:text-[#9b9187]",
      button: "bg-[#171412] text-white hover:bg-[#2b2621]",
      iconPanel: "bg-[#171412] text-white",
      status: "bg-[#edf7d2] text-[#3f4a19]",
      danger: "border-red-200 bg-red-50 text-red-700",
    };
  }, [isDark]);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme);
    localStorage.setItem("rt-theme", nextTheme ? "dark" : "light");
  };

  const handleSend = async (value = input) => {
    const trimmed = value.trim();
    if (!validateMessage(trimmed) || isLoading || isTypingResponse) {
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);
    setCopiedId(null);
    setError("");

    const requestId = Date.now();
    activeRequestRef.current = requestId;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "The assistant could not respond.");
      }

      if (activeRequestRef.current !== requestId) {
        return;
      }

      const fullReply = data.reply || "The assistant could not respond right now.";
      const assistantId = `${Date.now()}-assistant`;
      const totalLength = fullReply.length;
      const totalSteps = Math.min(120, Math.max(18, Math.ceil(totalLength / 3)));
      const stepDelay = Math.max(14, Math.min(48, Math.floor(2200 / totalSteps)));
      const initialTypingDelay = Math.min(5000, Math.max(3000, 3000 + Math.floor(totalLength / 12)));
      let step = 0;

      setIsTypingResponse(true);
      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: "assistant",
          content: "",
        },
      ]);

      const typeNextChunk = () => {
        step += 1;
        const progress = step / totalSteps;
        const nextLength = Math.min(totalLength, Math.ceil(totalLength * progress));

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: fullReply.slice(0, nextLength),
                }
              : message,
          ),
        );

        if (nextLength >= totalLength) {
          typingTimerRef.current = null;
          setIsTypingResponse(false);
          return;
        }

        const recentChar = fullReply[nextLength - 1] || "";
        const punctuationPause = /[.!?]/.test(recentChar) ? 70 : /[,;:]/.test(recentChar) ? 35 : 0;

        typingTimerRef.current = window.setTimeout(
          typeNextChunk,
          stepDelay + punctuationPause,
        );
      };

      typingTimerRef.current = window.setTimeout(typeNextChunk, initialTypingDelay);

    } catch (requestError) {
      if (activeRequestRef.current !== requestId) {
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while contacting the assistant.",
      );
    } finally {
      if (activeRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const handleReset = () => {
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (!summarySentRef.current) {
      const sessionMessages = latestMessagesRef.current
        .filter((message) => message.id !== initialAssistantMessage.id)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const hasUserMessages = sessionMessages.some((message) => message.role === "user");

      if (hasUserMessages) {
        summarySentRef.current = true;
        void fetch("/api/session-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            trigger: "manual-reset",
            messages: sessionMessages,
          }),
          keepalive: true,
        }).catch(() => {
          summarySentRef.current = false;
        });
      }
    }

    activeRequestRef.current = 0;
    sessionIdRef.current = createSessionId();
    summarySentRef.current = false;
    setMessages([initialAssistantMessage]);
    setInput("");
    setIsLoading(false);
    setIsTypingResponse(false);
    setCopiedId(null);
    setError("");
  };

  const handleCopy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className={`min-h-screen overflow-hidden transition-colors duration-500 ${theme.page}`}>
      <div className="pointer-events-none fixed inset-0">
        <div
          className={`absolute left-1/2 top-[-160px] h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-3xl transition-colors duration-500 ${theme.glowOne}`}
        />
        <div
          className={`absolute bottom-[-220px] right-[-120px] h-[520px] w-[520px] rounded-full blur-3xl transition-colors duration-500 ${theme.glowTwo}`}
        />
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className={`fixed right-5 top-7 z-50 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition hover:scale-105 md:right-8 ${theme.chip}`}
        aria-label="Toggle light and dark mode"
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Icon name={isDark ? "sun" : "moon"} className="h-5 w-5" />
      </button>

      <header className="relative z-10 px-5 py-5">
        <div
          className={`mx-auto flex max-w-5xl items-center justify-between rounded-full border px-4 py-3 shadow-sm backdrop-blur-xl transition-colors duration-500 ${theme.header}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${theme.iconPanel}`}
            >
              RT
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Ritch Tribiana</p>
              <p className={`text-xs ${theme.softMuted}`}>Enterprise IT Support</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.linkedin.com/in/ritch-tribiana/"
              target="_blank"
              rel="noreferrer"
              className={`hidden rounded-full border px-4 py-2 text-sm sm:inline-flex sm:items-center ${theme.chip}`}
            >
              <Icon name="linkedin" className="mr-2 h-4 w-4" />
              LinkedIn
            </a>
            <a
              href="./Ritch_Tribiana_Enterprise_IT_Resume.pdf"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center rounded-full px-5 py-2 text-sm ${theme.button}`}
            >
              <Icon name="file" className="mr-2 h-4 w-4" />
              Resume
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col px-5 pb-8 pt-8 md:pb-14 md:pt-14">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div
            className={`mx-auto mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur ${theme.chip}`}
          >
            <Icon name="sparkles" className="h-4 w-4" />
            AI-powered portfolio guide
          </div>

          <h1 className="font-display text-5xl font-black tracking-[-0.06em] md:text-7xl">
            Hi, I&apos;m Ritch Tribiana.
          </h1>

          <p className={`mx-auto mt-5 max-w-2xl text-xl leading-8 ${theme.muted}`}>
            Enterprise IT Support Specialist with 9+ years of enterprise experience.
          </p>

          <p className={`mx-auto mt-3 max-w-2xl text-base leading-7 ${theme.softMuted}`}>
            This portfolio helps hiring managers and collaborators get to know me. You can
            also describe your IT support needs, and my assistant will suggest the best next
            step based on your inquiry.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45 }}
          className="mt-10"
        >
          <div
            className={`overflow-hidden rounded-[2.25rem] border backdrop-blur-xl transition-colors duration-500 ${theme.card}`}
          >
            <div className="border-b border-black/10 px-5 py-4 dark:border-white/10 md:px-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${theme.iconPanel}`}
                  >
                    <Icon name="bot" />
                  </div>
                  <div>
                    <h2 className="font-bold tracking-tight">Ask Ritch AI</h2>
                    <p className={`text-sm ${theme.softMuted}`}>
                      Portfolio guide for hiring and support questions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className={`rounded-full border p-2 transition ${theme.chip}`}
                    aria-label="Reset chat"
                  >
                    <Icon name="reset" className="h-4 w-4" />
                  </button>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.status}`}>
                    Online
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-7">
              {showSuggestedPrompts && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mb-5 flex flex-wrap justify-center gap-2"
                >
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void handleSend(prompt)}
                      disabled={isLoading}
                      className={`rounded-full border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${theme.chip}`}
                    >
                      {prompt}
                    </button>
                  ))}
                </motion.div>
              )}

              <div
                ref={chatViewportRef}
                className={`min-h-[360px] max-h-[420px] overflow-y-auto rounded-[1.75rem] p-4 transition-colors duration-500 md:p-5 ${theme.panel}`}
              >
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className={`group flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[88%] items-start gap-2 md:max-w-[74%] ${
                          message.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div
                          className={`rounded-[1.5rem] border px-5 py-3 text-sm leading-6 ${
                            message.role === "user"
                              ? `border-transparent ${theme.userBubble}`
                              : theme.assistantBubble
                          }`}
                        >
                          {message.content ? renderMessageContent(message.content) : null}
                        </div>
                        {message.role === "assistant" && (
                          <button
                            type="button"
                            onClick={() => void handleCopy(message)}
                            className={`mt-1 rounded-full border p-2 opacity-0 transition group-hover:opacity-100 ${theme.chip}`}
                            aria-label="Copy assistant response"
                          >
                            <Icon
                              name={copiedId === message.id ? "check" : "copy"}
                              className="h-3.5 w-3.5"
                            />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {(isLoading || isTypingResponse) && (
                    <div className="flex justify-start">
                      <div
                        className={`rounded-[1.5rem] border px-5 py-3 text-sm ${theme.assistantBubble}`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                          {isLoading
                            ? "Ritch is thinking through your question..."
                            : "Ritch is typing a reply..."}
                        </span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${theme.danger}`}>
                      {error}
                    </div>
                  )}
                </div>
              </div>

              <form
                className={`mt-4 flex items-center gap-3 rounded-full border px-4 py-3 shadow-sm transition-colors duration-500 ${theme.input}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <Icon name="search" className={`h-5 w-5 shrink-0 ${theme.softMuted}`} />
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Ask about my experience, or tell me what kind of IT support you need..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-80 md:text-base"
                  aria-label="Ask Ritch's Enterprise IT Support assistant"
                />
                <button
                  type="submit"
                  disabled={isLoading || isTypingResponse || !validateMessage(input)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full p-0 disabled:opacity-40 ${theme.button}`}
                >
                  <Icon name="send" className="h-4 w-4" />
                </button>
              </form>

              <p
                className={`mt-3 rounded-2xl border px-4 py-3 text-xs leading-5 transition-colors duration-500 ${theme.chip}`}
              >
                For follow-up and assistant improvement, inquiries may be summarized in a
                sanitized form. Please avoid entering passwords, codes, or private company
                data.
              </p>
            </div>
          </div>
        </motion.section>

        <footer
          className={`mt-8 flex flex-col items-center justify-center gap-3 text-sm md:flex-row md:gap-6 ${theme.softMuted}`}
        >
          <a
            className="inline-flex items-center gap-2 transition hover:opacity-75"
            href="mailto:Ritch.Tribiana@gmail.com"
          >
            <Icon name="mail" className="h-4 w-4" />
            Ritch.Tribiana@gmail.com
          </a>
          <a
            className="inline-flex items-center gap-2 transition hover:opacity-75"
            href="https://www.linkedin.com/in/ritch-tribiana/"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="linkedin" className="h-4 w-4" />
            linkedin.com/in/ritch-tribiana
          </a>
        </footer>
      </main>
    </div>
  );
}
