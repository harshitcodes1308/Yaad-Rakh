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
      {/* Background blobs for a premium look */}
      <div style={styles.blob1}></div>
      <div style={styles.blob2}></div>

      {/* Navigation Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.logoGroup}>
            <span style={styles.logoEmoji}>🧠</span>
            <span style={styles.logoText}>Yaad Rakh</span>
          </div>
          <div style={styles.navLinks}>
            <a href="/onboard" style={styles.navLink}>Onboarding</a>
            <a href="/demo" style={styles.navLinkPrimary}>Launch Simulator ➔</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <h1 style={styles.heroTitle}>Aapka Digital Munshi</h1>
        <p style={styles.heroSubtitle}>
          WhatsApp-First CRM for Indian Small Businesses. No apps to download. No passwords to remember. 
          Manage leads, follow-ups, and payments entirely over WhatsApp.
        </p>

        {/* Quick Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🏢</div>
            <div style={styles.statNum}>{totalBusinesses}</div>
            <div style={styles.statLabel}>Onboarded Businesses</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statNum}>{totalLeads}</div>
            <div style={styles.statLabel}>Total Saved Leads</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💬</div>
            <div style={styles.statNum}>Mock Mode</div>
            <div style={styles.statLabel}>Bot Status</div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main style={styles.mainContainer}>
        <div style={styles.layoutGrid}>
          
          {/* Left: Features Grid */}
          <div style={styles.featuresSection}>
            <h2 style={styles.sectionTitle}>Core Features</h2>
            <div style={styles.featuresGrid}>
              
              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>📝</span>
                  <h3 style={styles.featureTitle}>Lead Save via Natural Language</h3>
                </div>
                <p style={styles.featureDesc}>
                  Type lead details in Hinglish (e.g. <em>"Raj, 98765XXXXX, website banana hai, budget 15k"</em>) and the AI automatically extracts name, phone, need, and budget.
                </p>
              </div>

              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>🔔</span>
                  <h3 style={styles.featureTitle}>Bhool Mat Reminders</h3>
                </div>
                <p style={styles.featureDesc}>
                  Say <em>"2 din baad"</em> or <em>"1 hafta"</em> to schedule follow-ups. The bot automatically pings you when tasks are due with direct WhatsApp chat links.
                </p>
              </div>

              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>💸</span>
                  <h3 style={styles.featureTitle}>Payment Balance Tracker</h3>
                </div>
                <p style={styles.featureDesc}>
                  Track who owes you money in real-time. Text <em>"Meena ka 5000 baaki hai"</em> or <em>"Ramesh ne 3000 diya aaj"</em> to log debts and updates.
                </p>
              </div>

              <div style={styles.featureCard}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureIcon}>📈</span>
                  <h3 style={styles.featureTitle}>Kaisa Gaya? Deal Pipeline</h3>
                </div>
                <p style={styles.featureDesc}>
                  One-tap interactive buttons update your pipeline when follow-ups fire. Easily classify customers into won, lost, negotiating, or snoozed.
                </p>
              </div>

            </div>
          </div>

          {/* Right: Business Directory */}
          <div style={styles.directorySection}>
            <div style={styles.directoryHeader}>
              <h2 style={styles.sectionTitle}>Active Accounts</h2>
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
                        Owner: {b.ownerName || "N/A"} • Category: {b.category || "N/A"}
                      </div>
                      <div style={styles.businessPhone}>📞 {b.whatsappNumber}</div>
                    </div>
                    <div style={styles.businessRight}>
                      <span style={{
                        ...styles.planBadge,
                        backgroundColor: b.plan === "pro" ? "#fef3c7" : b.plan === "starter" ? "#e0e7ff" : "#f3f4f6",
                        color: b.plan === "pro" ? "#92400e" : b.plan === "starter" ? "#3730a3" : "#374151"
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
        <p>© 2026 Yaad Rakh CRM. Built with ❤️ for Indian Small Businesses by Devnddez.</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#faf9ff",
    color: "#1e1b4b",
    fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
    position: "relative",
    overflowX: "hidden",
    paddingBottom: 40,
  },
  blob1: {
    position: "absolute",
    top: "-10%",
    left: "-10%",
    width: "40vw",
    height: "40vw",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(167,243,208,0.4) 0%, rgba(250,249,255,0) 70%)",
    zIndex: 0,
  },
  blob2: {
    position: "absolute",
    top: "30%",
    right: "-10%",
    width: "50vw",
    height: "50vw",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(224,231,255,0.4) 0%, rgba(250,249,255,0) 70%)",
    zIndex: 0,
  },
  header: {
    position: "relative",
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(224,231,255,0.8)",
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
    fontSize: 28,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 800,
    background: "linear-gradient(135deg, #075e54, #4f46e5)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  navLink: {
    color: "#4b5563",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    transition: "color 0.2s",
  },
  navLinkPrimary: {
    backgroundColor: "#075e54",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 4px 6px -1px rgba(7,94,84,0.2)",
    transition: "all 0.2s",
  },
  heroSection: {
    position: "relative",
    zIndex: 5,
    maxWidth: 900,
    margin: "64px auto 40px",
    textAlign: "center",
    padding: "0 20px",
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 900,
    margin: "0 0 16px 0",
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  heroSubtitle: {
    fontSize: 18,
    lineHeight: "1.6",
    color: "#475569",
    margin: "0 auto 40px",
    maxWidth: 720,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 24,
    maxWidth: 800,
    margin: "0 auto",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    textAlign: "center",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.02), 0 4px 6px -4px rgba(0,0,0,0.02)",
    border: "1px solid rgba(224,231,255,0.5)",
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNum: {
    fontSize: 32,
    fontWeight: 800,
    color: "#075e54",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 600,
    marginTop: 4,
  },
  mainContainer: {
    position: "relative",
    zIndex: 5,
    maxWidth: 1200,
    margin: "40px auto",
    padding: "0 20px",
  },
  layoutGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: 40,
  },
  featuresSection: {
    display: "flex",
    flexDirection: "column",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 20,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  },
  featureCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    border: "1px solid rgba(224,231,255,0.5)",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
  },
  featureHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#1e293b",
    margin: 0,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: "1.5",
    color: "#64748b",
    margin: 0,
  },
  directorySection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    border: "1px solid rgba(224,231,255,0.5)",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)",
    alignSelf: "start",
  },
  directoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  addBtn: {
    color: "#075e54",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
    border: "1px solid #075e54",
    padding: "6px 12px",
    borderRadius: 6,
    transition: "all 0.2s",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    margin: "0 0 12px 0",
  },
  emptyLink: {
    color: "#075e54",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  },
  businessList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  businessCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #f1f5f9",
    backgroundColor: "#fafafb",
  },
  businessInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  businessName: {
    fontWeight: 700,
    fontSize: 14,
    color: "#0f172a",
  },
  businessMeta: {
    fontSize: 11,
    color: "#64748b",
  },
  businessPhone: {
    fontSize: 12,
    color: "#075e54",
    fontWeight: 600,
  },
  businessRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  planBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 10,
    textTransform: "uppercase",
  },
  customerCount: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 500,
  },
  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 80,
    position: "relative",
    zIndex: 5,
  },
};
