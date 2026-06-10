"use client";

import { useState, useEffect, useRef } from "react";
import { MockLogEntry } from "@/lib/whatsapp";

interface ChatMessage {
  id: string;
  sender: "customer" | "bot";
  content: string;
  timestamp: string;
}

export default function ChatSimulator({ businessPhone }: { businessPhone: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling for bot replies every 2 seconds
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/mock/whatsapp/logs");
        const data = await res.json();
        
        if (data.success && data.logs) {
          // Compare logs with our local bot messages
          // In a real app we'd use WebSockets or better syncing
          // but for local simulator this is fine
          setMessages((prev) => {
            const botMessages = prev.filter((m) => m.sender === "bot");
            const newLogs: MockLogEntry[] = data.logs;
            
            // If the server has more logs than we do, add the new ones
            if (newLogs.length > botMessages.length) {
              const customerMessages = prev.filter((m) => m.sender === "customer");
              
              // We need to re-sort them chronologically
              const mappedLogs: ChatMessage[] = newLogs.map((log) => ({
                id: log.id,
                sender: "bot",
                content: log.content,
                timestamp: log.timestamp,
              }));
              
              return [...customerMessages, ...mappedLogs].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    };

    const intervalId = setInterval(fetchLogs, 2000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `client_${Date.now()}`,
      sender: "customer",
      content: inputText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setLoading(true);

    try {
      await fetch("/api/mock/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: businessPhone,
          text: newMsg.content,
        }),
      });
    } catch (err) {
      console.error("Mock send failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setMessages([]);
    await fetch("/api/mock/whatsapp/logs?clear=true");
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <div style={styles.avatar}>🤖</div>
          <div>
            <h3 style={styles.botName}>Yaad Rakh Bot</h3>
            <p style={styles.status}>Online (Simulator)</p>
          </div>
        </div>
        <button onClick={handleClear} style={styles.clearBtn}>
          Clear Chat
        </button>
      </div>

      {/* Messages Window */}
      <div style={styles.messagesWindow}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            Send a Hinglish message to test the parser. <br />
            Example: "Rahul 9876543210 ka call aaya tha, 50k ka budget bol raha hai, kal wapas call karna hai."
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: msg.sender === "customer" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  backgroundColor: msg.sender === "customer" ? "#dcf8c6" : "#ffffff", // WhatsApp green
                  color: "#000",
                }}
              >
                <div style={styles.bubbleText}>
                  {msg.content.split("\\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
                <div style={styles.timeLabel}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={styles.typingIndicator}>Bot is parsing... ⏳</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={styles.inputArea}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message as the customer..."
          style={styles.input}
          disabled={loading}
        />
        <button type="submit" style={styles.sendBtn} disabled={loading || !inputText.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#e5ddd5", // Classic WhatsApp background
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  header: {
    backgroundColor: "#075e54",
    color: "#fff",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    fontSize: "24px",
    backgroundColor: "#fff",
    color: "#075e54",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  botName: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "bold",
  },
  status: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.8,
  },
  clearBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "white",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  messagesWindow: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
    backgroundSize: "cover",
  },
  emptyState: {
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: "16px",
    borderRadius: "8px",
    textAlign: "center",
    color: "#4a4a4a",
    margin: "auto",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    maxWidth: "75%",
    padding: "8px 12px",
    borderRadius: "8px",
    position: "relative",
    boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
  },
  bubbleText: {
    fontSize: "14px",
    lineHeight: "1.4",
  },
  timeLabel: {
    fontSize: "10px",
    color: "#666",
    textAlign: "right",
    marginTop: "4px",
  },
  typingIndicator: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#666",
  },
  inputArea: {
    display: "flex",
    padding: "10px",
    backgroundColor: "#f0f0f0",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "24px",
    border: "none",
    outline: "none",
    fontSize: "14px",
  },
  sendBtn: {
    backgroundColor: "#075e54",
    color: "white",
    border: "none",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },
};
