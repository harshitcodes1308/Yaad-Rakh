"use client";

import React from "react";

interface StepSuccessProps {
  businessName: string;
  botNumber: string;
  plan: string;
  onReset: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter (₹299/mo)",
  pro: "Pro (₹599/mo)",
};

export default function StepSuccess({
  businessName,
  botNumber,
  plan,
  onReset,
}: StepSuccessProps) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Success Icon */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
          marginBottom: 20,
          animation: "popIn 0.5s ease-out",
        }}
      >
        <span style={{ fontSize: 40 }}>✅</span>
      </div>

      <h2
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#1a1a2e",
          margin: "0 0 8px 0",
        }}
      >
        Yaad Rakh active ho gaya!
      </h2>

      <p
        style={{
          color: "#6b7280",
          fontSize: 15,
          margin: "0 0 28px 0",
        }}
      >
        <strong>{businessName}</strong> ka account ban gaya hai
      </p>

      {/* Bot Number Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)",
          padding: "24px 20px",
          borderRadius: 16,
          marginBottom: 20,
          border: "2px solid #c7d2fe",
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: "#6b7280",
            margin: "0 0 8px 0",
            fontWeight: 500,
          }}
        >
          📱 Client ko yeh number save karaayein:
        </p>
        <p
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#4338ca",
            margin: "0 0 4px 0",
            letterSpacing: 1,
            fontFamily: "monospace",
          }}
        >
          {botNumber}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#8b5cf6",
            margin: 0,
            fontWeight: 500,
          }}
        >
          Yaad Rakh Bot WhatsApp Number
        </p>
      </div>

      {/* Plan Info */}
      <div
        style={{
          background: "#f9fafb",
          padding: "14px 20px",
          borderRadius: 12,
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "1px solid #e5e7eb",
        }}
      >
        <span style={{ fontSize: 14, color: "#6b7280" }}>Selected Plan</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1a1a2e",
            background: "#e0e7ff",
            padding: "4px 12px",
            borderRadius: 6,
          }}
        >
          {PLAN_LABELS[plan] || plan}
        </span>
      </div>

      {/* Reset Button */}
      <button
        type="button"
        onClick={onReset}
        style={{
          width: "100%",
          padding: "14px 24px",
          fontSize: 16,
          fontWeight: 700,
          color: "#fff",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
          boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow =
            "0 6px 20px rgba(99, 102, 241, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 4px 14px rgba(99, 102, 241, 0.4)";
        }}
      >
        ➕ Naya Client Onboard Karo
      </button>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
