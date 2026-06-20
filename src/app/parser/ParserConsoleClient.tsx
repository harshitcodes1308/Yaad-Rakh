"use client";

import React, { useState, useEffect, useRef } from "react";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  stage: string;
}

interface Business {
  id: string;
  name: string;
  ownerName: string | null;
  whatsappNumber: string;
  category: string | null;
  plan: string;
  customers: Customer[];
  createdAt?: any;
  _count: {
    customers: number;
  };
}

interface CombinedLog {
  id: string;
  direction: "incoming" | "outgoing";
  to?: string;
  from?: string;
  content: string;
  type?: string;
  intent?: string;
  parsedData?: any;
  outcome?: string;
  timestamp: string;
}

interface CustomerMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: "business" | "customer";
}

export default function ParserConsoleClient({
  initialBusinesses,
}: {
  initialBusinesses: Business[];
}) {
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    initialBusinesses[0] || null
  );

  // Active business tab on the mock customer's phone
  const [activeCustomerChatBusinessId, setActiveCustomerChatBusinessId] = useState<string>(
    initialBusinesses[0]?.id || ""
  );

  // Unread badge counts on the customer's phone for each business thread
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Input states for triggers
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<CombinedLog[]>([]);

  // Invoice form states
  const [invoiceCustomer, setInvoiceCustomer] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceItem, setInvoiceItem] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Bulk message states
  const [bulkFestival, setBulkFestival] = useState("Diwali");
  const [bulkStage, setBulkStage] = useState("all");
  const [bulkMessageType, setBulkMessageType] = useState<"festival" | "announcement" | "custom">("festival");
  const [bulkCustomText, setBulkCustomText] = useState("hey [name] happy diwali from Yaad Rakh");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Reminder trigger state
  const [reminderLoading, setReminderLoading] = useState(false);

  // Webhook display panels
  const [lastWebhookEvent, setLastWebhookEvent] = useState<any>(null);
  const [lastParsedMetadata, setLastParsedMetadata] = useState<any>(null);
  const [lastOutcome, setLastOutcome] = useState<string>("");

  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const waMessageListRef = useRef<HTMLDivElement>(null);

  // Map of customer-received messages grouped by businessId
  const [customerMessages, setCustomerMessages] = useState<Record<string, CustomerMessage[]>>({});

  // Fetch data and update logs
  const fetchLogs = async (isFirstLoad = false) => {
    try {
      const res = await fetch("/api/mock/whatsapp/logs");
      const data = await res.json();
      if (data.success && data.combinedLogs) {
        setLogs(data.combinedLogs);

        // Update parsed metadata panel from the latest incoming command
        const incomingLogs = data.combinedLogs.filter(
          (l: CombinedLog) => l.direction === "incoming"
        );
        if (incomingLogs.length > 0) {
          const latest = incomingLogs[0];
          setLastWebhookEvent({
            object: "whatsapp_business_account",
            entry: [
              {
                id: "mock_entry_id",
                changes: [
                  {
                    value: {
                      messaging_product: "whatsapp",
                      metadata: {
                        display_phone_number: "919999999999",
                        phone_number_id: "mock_phone_id",
                      },
                      contacts: [{ wa_id: latest.from }],
                      messages: [
                        {
                          from: latest.from,
                          id: latest.id,
                          timestamp: Math.floor(
                            new Date(latest.timestamp).getTime() / 1000
                          ).toString(),
                          text: { body: latest.content },
                          type: "text",
                        },
                      ],
                    },
                    field: "messages",
                  },
                ],
              },
            ],
          });

          setLastParsedMetadata({
            intent: latest.intent,
            data: latest.parsedData,
          });

          setLastOutcome(latest.outcome || "Executed Prisma update");
        }

        // Process outgoing messages and route them to the mock customer's phone
        const newCustomerMessages: Record<string, CustomerMessage[]> = {};
        
        // Initialize arrays for all onboarded businesses
        businesses.forEach((b) => {
          newCustomerMessages[b.id] = [
            {
              id: `welcome_${b.id}`,
              content: `👋 Welcome to ${b.name} virtual desk. Your digital ledger is connected.`,
              timestamp: b.createdAt || new Date().toISOString(),
              sender: "business",
            },
          ];
        });

        // Filter out bot replies that went to customers rather than the owner
        const outgoingBotMsgs = data.combinedLogs.filter(
          (l: CombinedLog) => l.direction === "outgoing"
        );

        outgoingBotMsgs.forEach((log: any) => {
          // Look up which business owns this customer's phone number
          let sendingBusiness = businesses.find((b) =>
            b.customers.some((c) => c.phone === log.to)
          );

          // Fallback: Check if log is a bulk message or matching
          if (!sendingBusiness) {
            // Check if log to number matches owner's number
            const isOwnerMessage = businesses.some((b) => b.whatsappNumber === log.to);
            if (!isOwnerMessage) {
              // If it's a customer but not mapped, default to selected business
              sendingBusiness = selectedBusiness || undefined;
            }
          }

          if (sendingBusiness) {
            newCustomerMessages[sendingBusiness.id].push({
              id: log.id,
              content: log.content,
              timestamp: log.timestamp,
              sender: "business",
            });
          }
        });

        // Sort messages chronologically
        Object.keys(newCustomerMessages).forEach((key) => {
          newCustomerMessages[key].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        setCustomerMessages((prev) => {
          // Trigger unread badge indicators for chats that are NOT active
          if (!isFirstLoad) {
            const updatedBadges = { ...unreadCounts };
            Object.keys(newCustomerMessages).forEach((bId) => {
              if (bId !== activeCustomerChatBusinessId) {
                const prevLen = prev[bId]?.length || 0;
                const newLen = newCustomerMessages[bId]?.length || 0;
                if (newLen > prevLen) {
                  updatedBadges[bId] = (updatedBadges[bId] || 0) + (newLen - prevLen);
                }
              }
            });
            setUnreadCounts(updatedBadges);
          }
          return newCustomerMessages;
        });
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  // Poll logs
  useEffect(() => {
    fetchLogs(true);
    const interval = setInterval(() => fetchLogs(false), 1500);
    return () => clearInterval(interval);
  }, [businesses, selectedBusiness, activeCustomerChatBusinessId]);

  // Scroll mock customer chat to bottom only when active chat changes or message count increases
  const lastChatIdRef = useRef<string>("");
  const prevMsgCountRef = useRef<number>(0);

  useEffect(() => {
    const currentMessages = customerMessages[activeCustomerChatBusinessId] || [];
    const currentCount = currentMessages.length;
    const chatChanged = activeCustomerChatBusinessId !== lastChatIdRef.current;

    if (chatChanged || currentCount > prevMsgCountRef.current) {
      if (waMessageListRef.current) {
        waMessageListRef.current.scrollTo({
          top: waMessageListRef.current.scrollHeight,
          behavior: chatChanged ? "auto" : "smooth"
        });
      }
    }

    lastChatIdRef.current = activeCustomerChatBusinessId;
    prevMsgCountRef.current = currentCount;
  }, [activeCustomerChatBusinessId, customerMessages]);

  // Remove unread count when clicking a chat thread
  const handleSelectCustomerChat = (businessId: string) => {
    setActiveCustomerChatBusinessId(businessId);
    setUnreadCounts((prev) => {
      const copy = { ...prev };
      delete copy[businessId];
      return copy;
    });
  };

  // 1. Simulate Raw Command
  const handleSendRaw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !inputText.trim()) return;

    setLoading(true);
    try {
      await fetch("/api/mock/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: selectedBusiness.whatsappNumber,
          text: inputText,
        }),
      });
      setInputText("");
      setTimeout(() => fetchLogs(false), 800);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Trigger Pending Reminders (Cron Mock)
  const handleTriggerReminders = async () => {
    if (!selectedBusiness) return;
    setReminderLoading(true);

    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      
      // Update local customers info to reflect reminder status done/sent
      const businessRes = await fetch("/"); // trigger server data refresh
      
      alert(`Reminder daemon fired! Sent ${data.sentCount || 0} reminders to owners.`);
      setTimeout(() => fetchLogs(false), 800);
    } catch (err) {
      console.error(err);
    } finally {
      setReminderLoading(false);
    }
  };

  // 3. Trigger Digital Bill/Invoice
  const handleSendInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !invoiceCustomer || !invoiceAmount) return;
    setInvoiceLoading(true);

    const cmd = `${invoiceCustomer} digital bill of ${invoiceAmount} ${invoiceItem ? `for ${invoiceItem}` : ""}`;
    try {
      await fetch("/api/mock/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: selectedBusiness.whatsappNumber,
          text: cmd,
        }),
      });
      
      setInvoiceCustomer("");
      setInvoiceAmount("");
      setInvoiceItem("");
      
      setTimeout(() => fetchLogs(false), 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // 4. Trigger Segmented Bulk Broadcast
  const handleSendBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;
    setBulkLoading(true);

    // Format query command based on type
    let cmdText = "";
    if (bulkMessageType === "festival") {
      cmdText = `${bulkStage !== "all" ? `${bulkStage} leads ko ` : ""}Happy ${bulkFestival} bulk message send karo`;
    } else if (bulkMessageType === "announcement") {
      cmdText = `shop announcement: ${bulkCustomText} send to ${bulkStage} leads`;
    } else {
      cmdText = `custom message: ${bulkCustomText} send to ${bulkStage} leads`;
    }

    try {
      await fetch("/api/mock/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: selectedBusiness.whatsappNumber,
          text: cmdText,
        }),
      });
      setTimeout(() => fetchLogs(false), 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleClear = async () => {
    await fetch("/api/mock/whatsapp/logs?clear=true");
    setLogs([]);
    setLastWebhookEvent(null);
    setLastParsedMetadata(null);
    setLastOutcome("");
    setUnreadCounts({});
    
    // Clear receiver state
    const cleared: Record<string, CustomerMessage[]> = {};
    businesses.forEach((b) => {
      cleared[b.id] = [
        {
          id: `welcome_${b.id}`,
          content: `👋 Welcome to ${b.name} virtual desk. Your digital ledger is connected.`,
          timestamp: new Date().toISOString(),
          sender: "business",
        },
      ];
    });
    setCustomerMessages(cleared);
  };

  const activeChatBusiness = businesses.find((b) => b.id === activeCustomerChatBusinessId);
  const activeChatMessages = customerMessages[activeCustomerChatBusinessId] || [];

  return (
    <div style={styles.page}>
      <div style={styles.gridBackground}></div>

      {/* Top Navbar */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.logoGroup}>
            <span style={styles.logoEmoji}>🧠</span>
            <span style={styles.logoText}>Yaad Rakh</span>
            <span style={styles.badge}>Receiver perspective Client Demo</span>
          </div>
          <div style={styles.headerRight}>
            <button onClick={handleClear} style={styles.clearLogsBtn}>
              Reset Session Logs
            </button>
            <a href="/" style={styles.backBtn}>➔ Back to Home</a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div style={styles.consoleContainer}>
        {businesses.length === 0 ? (
          <div style={styles.emptyState}>
            <h2>No businesses onboarded yet</h2>
            <p style={{ color: "#a1a1aa", margin: "12px 0 20px" }}>
              Please onboard at least one business account to run the receiver client demo.
            </p>
            <a href="/onboard" style={styles.primaryLink}>Go to Onboarding ➔</a>
          </div>
        ) : (
          <div style={styles.dashboardLayout}>
            
            {/* LEFT PANEL: Business Sender & Operations Trigger Console */}
            <div style={styles.leftCol}>
              
              {/* Business Account Context */}
              <div style={styles.card}>
                <h3 style={styles.cardHeading}>🏢 Yaad Rakh Business Dashboard</h3>
                <p style={styles.cardDesc}>
                  Select the business sending invoices, follow-ups, or broadcasts.
                </p>
                <div style={styles.selectWrapper}>
                  <select
                    value={selectedBusiness?.id}
                    onChange={(e) => {
                      const found = businesses.find((b) => b.id === e.target.value);
                      if (found) setSelectedBusiness(found);
                    }}
                    style={styles.select}
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.whatsappNumber}) — {b.plan.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Operations Trigger Dashboard */}
              <div style={styles.card}>
                <h3 style={styles.cardHeading}>🚀 Trigger Outgoing Customer Messages</h3>
                <p style={styles.cardDesc}>
                  Click any trigger below. Because Yaad Rakh runs in the background, these actions will send WhatsApp messages directly to the Customer's phone (seen on the right mockup).
                </p>
                
                <div style={styles.operationsGrid}>
                  
                  {/* Digital Invoice Form */}
                  <div style={styles.opBox}>
                    <h4 style={styles.opTitle}>📄 Generate & Send Digital Bill</h4>
                    <form onSubmit={handleSendInvoice} style={styles.opForm}>
                      <input
                        type="text"
                        placeholder="Customer name (e.g. Rahul)"
                        value={invoiceCustomer}
                        onChange={(e) => setInvoiceCustomer(e.target.value)}
                        style={styles.opInput}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Amount (e.g. 1500)"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        style={styles.opInput}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Item details (e.g. tshirts)"
                        value={invoiceItem}
                        onChange={(e) => setInvoiceItem(e.target.value)}
                        style={styles.opInput}
                      />
                      <button
                        type="submit"
                        style={styles.opSubmitBtn}
                        disabled={invoiceLoading || !invoiceCustomer || !invoiceAmount}
                      >
                        {invoiceLoading ? "Generating..." : "Send Digital Invoice"}
                      </button>
                    </form>
                  </div>

                  {/* Segmented Bulk Broadcast Form */}
                  <div style={styles.opBox}>
                    <h4 style={styles.opTitle}>📢 Send Segmented Bulk Broadcast</h4>
                    <form onSubmit={handleSendBulk} style={styles.opForm}>
                      
                      <div style={styles.row}>
                        <div style={{ flex: 1 }}>
                          <label style={styles.smallLabel}>Type:</label>
                          <select
                            value={bulkMessageType}
                            onChange={(e: any) => setBulkMessageType(e.target.value)}
                            style={styles.opSelect}
                          >
                            <option value="festival">Festival Greeting</option>
                            <option value="announcement">Shop Launch</option>
                            <option value="custom">Custom Text</option>
                          </select>
                        </div>

                        <div style={{ flex: 1 }}>
                          <label style={styles.smallLabel}>Target Audience:</label>
                          <select
                            value={bulkStage}
                            onChange={(e) => setBulkStage(e.target.value)}
                            style={styles.opSelect}
                          >
                            <option value="all">All Contacts</option>
                            <option value="new">New Leads</option>
                            <option value="interested">Interested Leads</option>
                            <option value="negotiating">Negotiating Leads</option>
                            <option value="won">Won Leads</option>
                            <option value="lost">Lost Leads</option>
                          </select>
                        </div>
                      </div>

                      {bulkMessageType === "festival" ? (
                        <input
                          type="text"
                          placeholder="Festival name (e.g. Diwali)"
                          value={bulkFestival}
                          onChange={(e) => setBulkFestival(e.target.value)}
                          style={styles.opInput}
                          required
                        />
                      ) : (
                        <textarea
                          placeholder="Broadcast text... use [name] for personalization"
                          value={bulkCustomText}
                          onChange={(e) => setBulkCustomText(e.target.value)}
                          style={styles.opTextarea}
                          rows={2}
                          required
                        />
                      )}

                      <button type="submit" style={styles.opSubmitBtn} disabled={bulkLoading}>
                        {bulkLoading ? "Broadcasting..." : "Send Segmented Broadcast"}
                      </button>
                    </form>
                  </div>

                  {/* Reminder Trigger */}
                  <div style={{ ...styles.opBox, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={styles.opTitle}>⏰ Trigger Follow-up Reminders</h4>
                      <p style={{ fontSize: 11, color: "#a1a1aa", lineHeight: "1.4" }}>
                        Simulate the cron system check. Any pending follow-ups due now will fire alerts to the business owner, prompting deal updates.
                      </p>
                    </div>
                    <button
                      onClick={handleTriggerReminders}
                      style={{ ...styles.opSubmitBtn, backgroundColor: "#1e1b4b", color: "#c084fc", border: "1px solid #3b0764", marginTop: 12 }}
                      disabled={reminderLoading}
                    >
                      {reminderLoading ? "Running..." : "Trigger Due Reminders"}
                    </button>
                  </div>

                </div>
              </div>

              {/* Bot Command Simulator */}
              <div style={styles.card}>
                <h3 style={styles.cardHeading}>💬 Bot Commands Parser Simulator</h3>
                <p style={styles.cardDesc}>
                  Submit raw text instructions. The bot will automatically update records, trigger database changes, and log extraction variables below.
                </p>
                <form onSubmit={handleSendRaw} style={styles.rawForm}>
                  <input
                    type="text"
                    placeholder="Type command (e.g. Rahul 9876543210 ka lead save karo budget 15k)..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={styles.rawInput}
                  />
                  <button type="submit" style={styles.rawSubmitBtn} disabled={loading || !inputText.trim()}>
                    {loading ? "Parsing..." : "Parse Text ➔"}
                  </button>
                </form>

                {/* AI Extraction visualization panels */}
                {lastParsedMetadata && (
                  <div style={styles.metadataOutput}>
                    <div style={styles.metadataHeader}>
                      <span>Parsed Intent: <strong style={{ color: "#a855f7" }}>{lastParsedMetadata.intent}</strong></span>
                      <span style={{ fontSize: 11, color: "#10b981" }}>● DB Sync: {lastOutcome}</span>
                    </div>
                    <div style={styles.metadataGrid}>
                      {Object.entries(lastParsedMetadata.data || {}).map(([k, v]: [string, any]) => (
                        <div key={k} style={styles.metaBadge}>
                          {k}: <strong>{v === null ? "null" : String(v)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT PANEL: Mock Customer WhatsApp Mobile Screen */}
            <div style={styles.rightCol}>
              <div style={styles.mobilePhoneFrame}>
                
                {/* Phone Header Indicator */}
                <div style={styles.phoneIndicatorBar}>
                  <span>9:41</span>
                  <span>📶 🔋</span>
                </div>

                {/* WhatsApp Header App Bar */}
                <div style={styles.waAppBar}>
                  <div style={styles.waTitleGroup}>
                    <span style={styles.waAppTitle}>WhatsApp Demo</span>
                    <span style={styles.waAppSubtitle}>Receiver perspective phone</span>
                  </div>
                  <div style={styles.waHeaderIcons}>🔍 💬 ⋮</div>
                </div>

                {/* WhatsApp Chat Layout Container */}
                <div style={styles.waMainContainer}>
                  
                  {/* WhatsApp Sidebar (Chats thread list) */}
                  <div style={styles.waChatsSidebar}>
                    <div style={styles.waChatsTitle}>Chats</div>
                    <div style={styles.chatThreadsList}>
                      {businesses.map((b) => {
                        const messagesList = customerMessages[b.id] || [];
                        const lastMsg = messagesList[messagesList.length - 1];
                        const lastMsgContent = lastMsg ? lastMsg.content : "No messages";
                        const isCurrent = b.id === activeCustomerChatBusinessId;
                        const badgeCount = unreadCounts[b.id] || 0;

                        return (
                          <div
                            key={b.id}
                            onClick={() => handleSelectCustomerChat(b.id)}
                            style={{
                              ...styles.chatThreadItem,
                              backgroundColor: isCurrent ? "#27272a" : "transparent",
                            }}
                          >
                            <div style={styles.threadAvatar}>🏢</div>
                            <div style={styles.threadMeta}>
                              <div style={styles.threadNameRow}>
                                <span style={styles.threadName}>{b.name}</span>
                                <span style={styles.threadTime}>Now</span>
                              </div>
                              <div style={styles.threadMsgRow}>
                                <span style={styles.threadLastMsg}>{lastMsgContent}</span>
                                {badgeCount > 0 && (
                                  <span style={styles.unreadBadge}>{badgeCount}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* WhatsApp Message Panel */}
                  <div style={styles.waChatThreadPanel}>
                    {activeChatBusiness ? (
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {/* Selected Chat Contact Info */}
                        <div style={styles.waChatContactHeader}>
                          <div style={styles.contactAvatar}>🏢</div>
                          <div>
                            <h4 style={styles.contactName}>{activeChatBusiness.name}</h4>
                            <p style={styles.contactStatus}>Verified Business Account</p>
                          </div>
                        </div>

                        {/* Messages Stream list */}
                        <div ref={waMessageListRef} style={styles.waMessageList}>
                          {activeChatMessages.map((msg) => {
                            const isBusiness = msg.sender === "business";
                            return (
                              <div
                                key={msg.id}
                                style={{
                                  ...styles.waMsgRow,
                                  justifyContent: isBusiness ? "flex-start" : "flex-end",
                                }}
                              >
                                <div
                                  style={{
                                    ...styles.waMsgBubble,
                                    backgroundColor: isBusiness ? "#1f2937" : "#065f46",
                                    color: "#f3f4f6",
                                    borderTopLeftRadius: isBusiness ? 0 : 10,
                                    borderTopRightRadius: isBusiness ? 10 : 0,
                                  }}
                                >
                                  <div style={styles.waMsgText}>
                                    {msg.content.split("\n").map((line, ix) => (
                                      <span key={ix}>
                                        {line}
                                        <br />
                                      </span>
                                    ))}
                                  </div>
                                  <div style={styles.waMsgTime}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Fake WhatsApp Input */}
                        <div style={styles.waChatInputRow}>
                          <div style={styles.waInputBox}>😊 📎 Type a message...</div>
                          <div style={styles.waMicCircle}>🎙️</div>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.waChatSelectPrompt}>
                        Select a business thread on the sidebar to view chat logs.
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#09090b", // Slate 950
    color: "#f4f4f5",
    fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
    position: "relative",
    paddingBottom: 60,
    overflowX: "hidden",
  },
  gridBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 40%),
                      radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 40%)`,
    zIndex: 0,
    pointerEvents: "none",
  },
  header: {
    borderBottom: "1px solid #18181b",
    backgroundColor: "rgba(9, 9, 11, 0.8)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    padding: "16px 24px",
  },
  headerContainer: {
    maxWidth: 1400,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoEmoji: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 800,
    color: "#fafafa",
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: "#27272a",
    padding: "2px 8px",
    borderRadius: 20,
    color: "#a1a1aa",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  clearLogsBtn: {
    backgroundColor: "transparent",
    border: "1px solid #3f3f46",
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  backBtn: {
    fontSize: 13,
    fontWeight: 600,
    color: "#a1a1aa",
    textDecoration: "none",
  },
  consoleContainer: {
    maxWidth: 1400,
    margin: "32px auto",
    padding: "0 24px",
    position: "relative",
    zIndex: 5,
  },
  emptyState: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 20,
    padding: 60,
    textAlign: "center",
    maxWidth: 600,
    margin: "80px auto",
  },
  primaryLink: {
    display: "inline-block",
    backgroundColor: "#6366f1",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: 10,
    fontWeight: 600,
    textDecoration: "none",
  },
  dashboardLayout: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    gap: 32,
    alignItems: "start",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
  rightCol: {
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
  card: {
    backgroundColor: "#09090b",
    border: "1px solid #18181b",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: 800,
    color: "#f4f4f5",
    margin: 0,
  },
  cardDesc: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: "1.4",
  },
  selectWrapper: {
    width: "100%",
  },
  select: {
    width: "100%",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
    cursor: "pointer",
  },
  operationsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 20,
  },
  opBox: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 12,
    padding: 16,
  },
  opTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#f4f4f5",
    marginBottom: 12,
  },
  opForm: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  opInput: {
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#f4f4f5",
    fontSize: 12,
    outline: "none",
  },
  opSelect: {
    width: "100%",
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#f4f4f5",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
    marginTop: 4,
  },
  opTextarea: {
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#f4f4f5",
    fontSize: 12,
    outline: "none",
    fontFamily: "inherit",
    resize: "none",
  },
  opSubmitBtn: {
    backgroundColor: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  row: {
    display: "flex",
    gap: 12,
  },
  smallLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#71717a",
  },
  rawForm: {
    display: "flex",
    gap: 12,
  },
  rawInput: {
    flex: 1,
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#f4f4f5",
    fontSize: 13,
    outline: "none",
  },
  rawSubmitBtn: {
    backgroundColor: "#3f3f46",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "0 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  metadataOutput: {
    marginTop: 16,
    backgroundColor: "#18181b",
    borderRadius: 10,
    padding: 16,
    border: "1px solid #27272a",
  },
  metadataHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    fontWeight: 700,
    borderBottom: "1px solid #27272a",
    paddingBottom: 8,
    marginBottom: 8,
  },
  metadataGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  metaBadge: {
    backgroundColor: "#27272a",
    fontSize: 11,
    padding: "4px 8px",
    borderRadius: 6,
    color: "#d4d4d8",
  },

  // Mock phone frames
  mobilePhoneFrame: {
    width: "100%",
    maxWidth: 500,
    height: 720,
    backgroundColor: "#000",
    border: "14px solid #18181b",
    borderRadius: 40,
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    margin: "0 auto",
  },
  phoneIndicatorBar: {
    height: 32,
    backgroundColor: "#000",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    fontSize: 12,
    color: "#fff",
    fontWeight: 600,
  },
  waAppBar: {
    backgroundColor: "#111b21", // WA dark mode appbar
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #202c33",
  },
  waTitleGroup: {
    display: "flex",
    flexDirection: "column",
  },
  waAppTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#e9edef",
  },
  waAppSubtitle: {
    fontSize: 10,
    color: "#00a884",
    fontWeight: 700,
  },
  waHeaderIcons: {
    color: "#aebac1",
    fontSize: 16,
    display: "flex",
    gap: 16,
  },
  waMainContainer: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "160px 1fr",
    backgroundColor: "#111b21",
    overflow: "hidden",
  },
  waChatsSidebar: {
    borderRight: "1px solid #202c33",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  waChatsTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#aebac1",
    padding: "10px 12px",
    textTransform: "uppercase",
    borderBottom: "1px solid #202c33",
  },
  chatThreadsList: {
    display: "flex",
    flexDirection: "column",
  },
  chatThreadItem: {
    display: "flex",
    padding: "10px 8px",
    gap: 8,
    cursor: "pointer",
    alignItems: "center",
    borderBottom: "1px solid #202c33",
    transition: "background 0.2s",
  },
  threadAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    backgroundColor: "#2a3942",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
  threadMeta: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  threadNameRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  threadName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#e9edef",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  threadTime: {
    fontSize: 8,
    color: "#8696a0",
  },
  threadMsgRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  threadLastMsg: {
    fontSize: 10,
    color: "#8696a0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 90,
  },
  unreadBadge: {
    backgroundColor: "#00a884",
    color: "#111b21",
    borderRadius: "50%",
    fontSize: 8,
    fontWeight: 800,
    minWidth: 14,
    height: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  waChatThreadPanel: {
    backgroundColor: "#0b141a", // WA chat wallpaper background
    backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
    backgroundSize: "cover",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  waChatContactHeader: {
    backgroundColor: "#202c33",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid #111b21",
  },
  contactAvatar: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    backgroundColor: "#2a3942",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
  },
  contactName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#e9edef",
    margin: 0,
  },
  contactStatus: {
    fontSize: 8,
    color: "#8696a0",
    margin: 0,
  },
  waMessageList: {
    flex: 1,
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
  },
  waMsgRow: {
    display: "flex",
    width: "100%",
  },
  waMsgBubble: {
    maxWidth: "85%",
    borderRadius: 10,
    padding: "8px 10px",
    position: "relative",
    boxShadow: "0 1px 1px rgba(0,0,0,0.15)",
  },
  waMsgText: {
    fontSize: 11,
    lineHeight: "1.4",
  },
  waMsgTime: {
    fontSize: 8,
    opacity: 0.6,
    textAlign: "right",
    marginTop: 4,
  },
  waChatInputRow: {
    backgroundColor: "#202c33",
    padding: "8px 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  waInputBox: {
    flex: 1,
    backgroundColor: "#2a3942",
    borderRadius: 20,
    padding: "8px 12px",
    fontSize: 11,
    color: "#8696a0",
  },
  waMicCircle: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    backgroundColor: "#00a884",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
  },
  waChatSelectPrompt: {
    margin: "auto",
    color: "#8696a0",
    fontSize: 12,
    textAlign: "center",
    padding: 20,
  },
};
