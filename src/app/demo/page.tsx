import { prisma } from "@/lib/db";
import ChatSimulator from "@/components/demo/ChatSimulator";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Yaad Rakh Simulator</h1>
          <p style={styles.subtitle}>
            Test your WhatsApp bot locally without the 360dialog API.
          </p>
        </div>
      </header>

      <main style={styles.main}>
        {businesses.length === 0 ? (
          <div style={styles.emptyState}>
            <h2>No businesses found</h2>
            <p>You need to onboard a business first before testing the bot.</p>
            <a href="/onboard" style={styles.linkButton}>
              Go to Onboarding ➔
            </a>
          </div>
        ) : (
          <div style={styles.layout}>
            <div style={styles.sidebar}>
              <h3 style={styles.sidebarTitle}>Test Phone Numbers</h3>
              <p style={styles.sidebarDesc}>
                Select a business to simulate a customer messaging them.
              </p>
              
              <div style={styles.businessList}>
                {businesses.map((b: any) => (
                  <div key={b.id} style={styles.businessCard}>
                    <div style={styles.businessName}>{b.name}</div>
                    <div style={styles.businessPhone}>
                      {b.whatsappNumber}
                    </div>
                    <div style={{
                      ...styles.badge,
                      backgroundColor: b.plan === "pro" ? "#1a3c34" : b.plan === "starter" ? "#1e3a8a" : "#e2e8f0",
                      color: b.plan === "pro" || b.plan === "starter" ? "#ffffff" : "#1a1a1a"
                    }}>
                      {b.plan} plan
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.simulatorWrapper}>
              {/* We just pass the FIRST business's whatsapp number for the simulator 
                  In a real app, clicking the sidebar would change this using state, 
                  but for a quick demo page, the most recently added business is fine. */}
              <div style={styles.simulatorHeader}>
                Simulating messages sent to: <strong>{businesses[0].name}</strong>
              </div>
              <div style={styles.phoneFrame}>
                <ChatSimulator businessPhone={businesses[0].whatsappNumber} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  pageHeader: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #eaeaea",
    padding: "24px 0",
    marginBottom: "32px",
  },
  headerContent: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "0 20px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#111",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#666",
  },
  main: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "0 20px 40px",
  },
  emptyState: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "12px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  linkButton: {
    display: "inline-block",
    marginTop: "16px",
    backgroundColor: "#075e54",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: "32px",
    alignItems: "start",
  },
  sidebar: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    color: "#1a1a1a",
  },
  sidebarTitle: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  sidebarDesc: {
    margin: "0 0 16px 0",
    fontSize: "14px",
    color: "#4a5568",
    lineHeight: "1.4",
  },
  businessList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  businessCard: {
    padding: "12px",
    border: "1px solid #eaeaea",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    borderLeft: "4px solid #0f766e",
  },
  businessName: {
    fontWeight: "bold",
    fontSize: "14px",
    marginBottom: "4px",
    color: "#1a1a1a",
  },
  businessPhone: {
    fontSize: "13px",
    color: "#4a5568",
    marginBottom: "8px",
  },
  badge: {
    display: "inline-block",
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "12px",
    textTransform: "capitalize",
    fontWeight: "600",
  },
  simulatorWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  simulatorHeader: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
  },
  phoneFrame: {
    height: "600px",
    width: "100%",
    maxWidth: "400px",
    margin: "0 auto",
    border: "12px solid #222",
    borderRadius: "36px",
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
};
