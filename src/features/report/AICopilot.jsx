import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { Drawer, Button, Input } from "../../ui";

export default function AICopilot({ reportId, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content:
        "Hello! I am your forensic AI Copilot. Ask me anything about this report.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);
    setMessages((prev) => [...prev, { role: "ai", content: "" }]);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `http://localhost:5000/api/reports/${reportId}/explain`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question: userMessage }),
        },
      );

      if (!response.ok) throw new Error("Failed to connect to AI");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content += data.text;
                  return newMsgs;
                });
              } else if (data.error) {
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = data.error;
                  return newMsgs;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE:", e);
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content =
          "Connection error. Please try again.";
        return newMsgs;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bot size={20} color="var(--primary)" /> AI Copilot
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 12,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background:
                  msg.role === "user"
                    ? "var(--primary)"
                    : "rgba(255,255,255,0.05)",
                border:
                  msg.role === "ai" ? "1px solid var(--panel-border)" : "none",
                padding: "12px 16px",
                borderRadius: 12,
                borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                borderBottomLeftRadius: msg.role === "ai" ? 4 : 12,
                maxWidth: "85%",
                fontSize: "0.9rem",
                lineHeight: 1.5,
              }}
            >
              {msg.role === "ai" && (
                <Sparkles
                  size={14}
                  style={{ marginBottom: 6, color: "var(--accent)" }}
                />
              )}
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          ))}
          {isTyping && messages[messages.length - 1].content === "" && (
            <div
              style={{
                alignSelf: "flex-start",
                background: "rgba(255,255,255,0.05)",
                padding: "12px 16px",
                borderRadius: 12,
                borderBottomLeftRadius: 4,
              }}
            >
              <Loader2 size={16} className="spin" color="var(--accent-muted)" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ marginTop: 24, display: "flex", gap: 8 }}
        >
          <Input
            placeholder="Ask about this report..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            containerClassName="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={isTyping || !input.trim()}
          >
            <Send size={16} />
          </Button>
        </form>

        <div
          style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          <button
            type="button"
            onClick={() => setInput("Summarize the main risks.")}
            className="suggest-chip"
          >
            Summarize risks
          </button>
          <button
            type="button"
            onClick={() => setInput("Generate a warning message for a buyer.")}
            className="suggest-chip"
          >
            Buyer warning
          </button>
          <button
            type="button"
            onClick={() => setInput("Why is the price considered suspicious?")}
            className="suggest-chip"
          >
            Price analysis
          </button>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
          .suggest-chip {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 100px;
            padding: 6px 12px;
            font-size: 0.75rem;
            color: var(--accent-muted);
            cursor: pointer;
            transition: all 0.2s;
          }
          .suggest-chip:hover {
            background: rgba(255,255,255,0.08);
            color: #fff;
            border-color: rgba(255,255,255,0.2);
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `,
          }}
        />
      </div>
    </Drawer>
  );
}
