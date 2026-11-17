"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import styles from "./ChatWindow.module.css";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function ChatWindow() {
  const { state } = useSession();

  // Natural state: starts clean with no hardcoded dummy messages
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (presetText?: string) => {
    const textToSend = (presetText || input).trim();
    if (!textToSend || isStreaming) return;

    if (!presetText) setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: textToSend },
      { role: "assistant", content: "" },
    ]);
    setIsStreaming(true);

    try {
      if (!state.sessionId) {
        setTimeout(() => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content:
                "Please upload a resume and add at least one job posting first so I can compare your experience against actual role requirements.",
            };
            return updated;
          });
          setIsStreaming(false);
        }, 300);
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.sessionId, message: textToSend }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chat failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "token" && data.text) {
                  assistantContent += data.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                    return updated;
                  });
                } else if (data.type === "error" && data.error) {
                  assistantContent += `\n\n⚠️ ${data.error}`;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                    return updated;
                  });
                }
              } catch {
                // partial chunk, ignore
              }
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            role: "assistant",
            content: `⚠️ ${error instanceof Error ? error.message : "Something went wrong"}.`,
          };
          return updated;
        }
        return [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ ${error instanceof Error ? error.message : "Something went wrong"}.`,
          },
        ];
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Ask about your fit</h3>

      {/* Messages View */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "#9ca3af",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <MessageSquare size={24} color="#d1d5db" />
            <p style={{ fontSize: "12px", color: "#6b7280", maxWidth: "380px" }}>
              Ask follow-up questions to compare roles, explore skill gaps, or generate custom interview talking points tied directly to your resume.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={
                msg.role === "user" ? styles.messageRowUser : styles.messageRowAssistant
              }
            >
              {msg.role === "user" ? (
                <div className={styles.userBubble}>{msg.content}</div>
              ) : (
                <div className={styles.assistantBubble}>
                  {msg.content ? (
                    <>
                      <div
                        className={styles.markdownBody}
                        dangerouslySetInnerHTML={{
                          __html: formatMarkdown(msg.content),
                        }}
                      />
                      {isStreaming && idx === messages.length - 1 && (
                        <span className={styles.pulsingCursor} />
                      )}
                    </>
                  ) : (
                    <div className={styles.thinkingContainer}>
                      <Loader2 size={14} className={styles.spinIcon} />
                      <span className={styles.thinkingText}>
                        Comparing resume against requirements with Groq
                      </span>
                      <span className={styles.typingDots}>
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions pills */}
      <div className={styles.suggestionsRow}>
        <button
          onClick={() => sendMessage("Which job should I apply to first and why?")}
          disabled={isStreaming}
          className={styles.suggestionChip}
        >
          Which job first?
        </button>
        <button
          onClick={() => sendMessage("What skills am I missing for Job #1 vs Job #2?")}
          disabled={isStreaming}
          className={styles.suggestionChip}
        >
          Compare missing skills
        </button>
        <button
          onClick={() =>
            sendMessage(
              "Prepare me for an interview for Job #1 with 3 likely questions and talking points from my experience"
            )
          }
          disabled={isStreaming}
          className={styles.suggestionChip}
        >
          Prep me for Job #1
        </button>
      </div>

      {/* Input Bar */}
      <div className={styles.inputRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder={
            isStreaming
              ? "Generating grounded response with Groq Llama 3.3..."
              : "Ask a question about your fit, skill gaps, or interview talking points..."
          }
          className={styles.inputField}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isStreaming}
          className={styles.sendBtn}
        >
          {isStreaming ? (
            <>
              <Loader2 size={13} className={styles.spinIcon} />
              <span>Thinking...</span>
            </>
          ) : (
            <span>Send</span>
          )}
        </button>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code style="background:#e5e7eb;padding:1px 4px;border-radius:4px;">$1</code>');
  return formatted;
}
