import React from "react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch active businesses
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { customers: true },
      },
    },
  });

  const totalBusinesses = businesses.length;
  const totalLeads = businesses.reduce((acc, curr) => acc + curr._count.customers, 0);

  return (
    <div style={styles.page}>
      {/* Background radial highlight */}
      <div style={styles.bgGlow}></div>

      {/* Navigation Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.logoGroup}>
            <span style={styles.logoEmoji}>🧠</span>
            <span style={styles.logoText}>Yaad Rakh</span>
          </div>
          <div style={styles.navLinks}>
            <a href="/onboard" style={styles.navLink}>Onboarding</a>
            <a href="/parser" style={styles.navLink}>Parser Console</a>
            <a href="/demo" style={styles.navLinkPrimary}>Launch Simulator ➔</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.tagline}>AAPKA DIGITAL MUNSHI</div>
        <h1 style={styles.heroTitle}>WhatsApp-First CRM for Indian Small Businesses</h1>
        <p style={styles.heroSubtitle}>
          No apps to download. No passwords to remember. Manage your leads, automated follow-ups, 
          segmented bulk broadcasts, digital invoices, and staff attendance entirely over WhatsApp.
        </p>

        {/* Action Button Grid */}
        <div style={styles.heroActions}>
          <a href="/parser" style={styles.actionBtnSecondary}>
            Open Live Parser Console
          </a>
          <a href="/demo" style={styles.actionBtnPrimary}>
            Launch Chat Simulator
          </a>
        </div>

        {/* Quick Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{totalBusinesses}</div>
            <div style={styles.statLabel}>Active Businesses</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{totalLeads}</div>
            <div style={styles.statLabel}>Saved Leads</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>GPT-4o-mini</div>
            <div style={styles.statLabel}>AI Model</div>
          </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <main style={styles.mainContainer}>
        <div style={styles.layoutGrid}>
          
          {/* Left Side: Features Grid */}
          <div style={styles.featuresSection}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>What Yaad Rakh Can Do</h2>
              <p style={styles.sectionDesc}>Powerful automated utility features run using natural language prompts.</p>
            </div>
            
            <div style={styles.featuresGrid}>
              
              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>✍️</span>
                  <h3 style={styles.featureTitle}>Lead Capture in Hinglish</h3>
                </div>
                <p style={styles.featureDesc}>
                  Type lead details informally like <em>"Rahul 9876543210 website banana hai budget 25k"</em> and the AI extracts name, phone, need, and budget automatically.
                </p>
              </div>

              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>🔔</span>
                  <h3 style={styles.featureTitle}>Bhool Mat Reminders</h3>
                </div>
                <p style={styles.featureDesc}>
                  Say <em>"2 din baad"</em> or <em>"1 hafta baad"</em> to schedule follow-ups. Yaad Rakh automatically prompts you when tasks are due.
                </p>
              </div>

              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>💸</span>
                  <h3 style={styles.featureTitle}>Udhari & Debts Tracker</h3>
                </div>
                <p style={styles.featureDesc}>
                  Track outstanding balances in real-time. Message <em>"Meena ka 5000 baaki hai"</em> or <em>"Ramesh ne 3000 diya"</em> to settle bills.
                </p>
              </div>

              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>🎯</span>
                  <h3 style={styles.featureTitle}>Target Segmented Broadcasts</h3>
                </div>
                <p style={styles.featureDesc}>
                  Send bulk festival wishes or launches to selected stages (e.g. <em>"Happy Diwali wish send to won leads"</em> or <em>"Winter collection launch announcement to all"</em>).
                </p>
              </div>

              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>📄</span>
                  <h3 style={styles.featureTitle}>Digital Invoices & Bills</h3>
                </div>
                <p style={styles.featureDesc}>
                  Generate digital bills on the fly (e.g. <em>"Rahul digital bill of 3200 for leather shoes"</em>) with mock online payment links.
                </p>
              </div>

              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>⏰</span>
                  <h3 style={styles.featureTitle}>Staff Operations & Daily Stats</h3>
                </div>
                <p style={styles.featureDesc}>
                  Punch staff login/logout (e.g., <em>"Ramesh staff punch in"</em>) and view complete active business dashboard logs using text requests.
                </p>
              </div>

            </div>
          </div>

          {/* Right Side: Active Accounts Directory */}
          <div style={styles.directorySection}>
            <div style={styles.directoryHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Onboarded Accounts</h2>
                <p style={{ ...styles.sectionDesc, margin: 0 }}>Registered business profiles</p>
              </div>
              <a href="/onboard" style={styles.addBtn}>+ Onboard New</a>
            </div>
            
            {businesses.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>No businesses onboarded yet.</p>
                <a href="/onboard" style={styles.emptyLink}>Add your first business client ➔</a>
              </div>
            ) : (
              <div style={styles.businessList}>
                {businesses.map((b) => (
                  <div key={b.id} style={styles.businessCard}>
                    <div style={styles.businessInfo}>
                      <div style={styles.businessName}>{b.name}</div>
                      <div style={styles.businessMeta}>
                        Owner: {b.ownerName || "N/A"} • {b.category || "General"}
                      </div>
                      <div style={styles.businessPhone}>📞 {b.whatsappNumber}</div>
                    </div>
                    <div style={styles.businessRight}>
                      <span style={{
                        ...styles.planBadge,
                        backgroundColor: b.plan === "pro" ? "#f3e8ff" : b.plan === "starter" ? "#e0e7ff" : "#f4f4f5",
                        color: b.plan === "pro" ? "#6b21a8" : b.plan === "starter" ? "#3730a3" : "#52525b",
                        border: `1px solid ${b.plan === "pro" ? "#e9d5ff" : b.plan === "starter" ? "#c7d2fe" : "#e4e4e7"}`
                      }}>
                        {b.plan}
                      </span>
                      <div style={styles.customerCount}>{b._count.customers} leads</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 Yaad Rakh CRM. Built with ❤️ for Indian Small Businesses.</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#09090b",
    fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: "relative",
    overflowX: "hidden",
    paddingBottom: 60,
  },
  bgGlow: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100vw",
    height: "600px",
    background: "radial-gradient(100% 100% at 50% 0%, rgba(99, 102, 241, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
    zIndex: 0,
    pointerEvents: "none",
  },
  header: {
    position: "relative",
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #f4f4f5",
    padding: "16px 24px",
  },
  headerContainer: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoEmoji: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 800,
    color: "#09090b",
    letterSpacing: "-0.02em",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  navLink: {
    color: "#71717a",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 13,
    transition: "color 0.2s",
  },
  navLinkPrimary: {
    backgroundColor: "#09090b",
    color: "#ffffff",
    padding: "8px 16px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 13,
    transition: "background 0.2s",
  },
  heroSection: {
    position: "relative",
    zIndex: 5,
    maxWidth: 800,
    margin: "80px auto 48px",
    textAlign: "center",
    padding: "0 24px",
  },
  tagline: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "#6366f1",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: 900,
    margin: "0 0 18px 0",
    color: "#09090b",
    letterSpacing: "-0.03em",
    lineHeight: "1.15",
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: "1.6",
    color: "#71717a",
    margin: "0 auto 36px",
    maxWidth: 680,
    fontWeight: 400,
  },
  heroActions: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    marginBottom: 48,
  },
  actionBtnPrimary: {
    backgroundColor: "#09090b",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    transition: "all 0.2s",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)",
  },
  actionBtnSecondary: {
    backgroundColor: "#ffffff",
    color: "#09090b",
    border: "1px solid #e4e4e7",
    padding: "12px 24px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    transition: "all 0.2s",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    maxWidth: 540,
    margin: "0 auto",
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: "16px",
    textAlign: "center",
    border: "1px solid #f4f4f5",
  },
  statNum: {
    fontSize: 22,
    fontWeight: 800,
    color: "#09090b",
  },
  statLabel: {
    fontSize: 11,
    color: "#a1a1aa",
    fontWeight: 600,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  mainContainer: {
    position: "relative",
    zIndex: 5,
    maxWidth: 1200,
    margin: "40px auto",
    padding: "0 24px",
  },
  layoutGrid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr",
    gap: 48,
  },
  featuresSection: {
    display: "flex",
    flexDirection: "column",
  },
  sectionHeader: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#09090b",
    letterSpacing: "-0.01em",
  },
  sectionDesc: {
    fontSize: 13,
    color: "#71717a",
    marginTop: 4,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20,
  },
  featureCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: "20px",
    border: "1px solid #f4f4f5",
    transition: "all 0.2s",
  },
  featureHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#09090b",
    margin: 0,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: "1.5",
    color: "#71717a",
    margin: 0,
  },
  directorySection: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: "24px",
    border: "1px solid #f4f4f5",
    alignSelf: "start",
  },
  directoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  addBtn: {
    color: "#09090b",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 12,
    border: "1px solid #e4e4e7",
    padding: "6px 14px",
    borderRadius: 8,
    transition: "all 0.2s",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
  },
  emptyText: {
    color: "#71717a",
    fontSize: 13,
    margin: "0 0 12px 0",
  },
  emptyLink: {
    color: "#6366f1",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 13,
  },
  businessList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  businessCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderRadius: 12,
    border: "1px solid #f4f4f5",
    backgroundColor: "#fafafa",
  },
  businessInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  businessName: {
    fontWeight: 700,
    fontSize: 14,
    color: "#09090b",
  },
  businessMeta: {
    fontSize: 11,
    color: "#71717a",
  },
  businessPhone: {
    fontSize: 11,
    color: "#71717a",
    fontWeight: 600,
  },
  businessRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  planBadge: {
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 6,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  customerCount: {
    fontSize: 11,
    color: "#71717a",
    fontWeight: 500,
  },
  footer: {
    textAlign: "center",
    color: "#a1a1aa",
    fontSize: 11,
    marginTop: 80,
  },
};
