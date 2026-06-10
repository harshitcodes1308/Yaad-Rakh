"use client";

import React from "react";

interface StepPlanSelectProps {
  selectedPlan: string;
  onPlanChange: (plan: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "",
    features: ["10 leads", "1 user", "Basic reminders"],
    color: "#10b981",
    gradient: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
    borderColor: "#10b981",
  },
  {
    id: "starter",
    name: "Starter",
    price: "₹299",
    period: "/month",
    features: [
      "Unlimited leads",
      "Reminders + follow-ups",
      "Payment tracker",
    ],
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
    borderColor: "#6366f1",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹599",
    period: "/month",
    features: [
      "Everything in Starter",
      "Tyohar bulk sender",
      "Monthly report",
    ],
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    borderColor: "#f59e0b",
  },
];

export default function StepPlanSelect({
  selectedPlan,
  onPlanChange,
  onSubmit,
  onBack,
  loading,
}: StepPlanSelectProps) {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1a1a2e",
            margin: "0 0 4px 0",
          }}
        >
          💎 Plan Chunein
        </h2>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
          Client ke liye sahi plan select karein
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <div
              key={plan.id}
              onClick={() => onPlanChange(plan.id)}
              style={{
                position: "relative",
                padding: "18px 20px",
                borderRadius: 14,
                border: isSelected
                  ? `2.5px solid ${plan.borderColor}`
                  : "2px solid #e5e7eb",
                background: isSelected ? plan.gradient : "#fff",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isSelected
                  ? `0 4px 14px ${plan.borderColor}33`
                  : "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {plan.popular && (
                <span
                  style={{
                    position: "absolute",
                    top: -10,
                    right: 16,
                    background: plan.color,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 6,
                    letterSpacing: 0.5,
                  }}
                >
                  POPULAR
                </span>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#1a1a2e",
                    }}
                  >
                    {plan.name}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: plan.color,
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}
                  >
                    {plan.period}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {plan.features.map((feature, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 12,
                      color: "#4b5563",
                      background: isSelected
                        ? "rgba(255,255,255,0.7)"
                        : "#f3f4f6",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontWeight: 500,
                    }}
                  >
                    ✓ {feature}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          style={{
            flex: "0 0 auto",
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 600,
            color: "#6b7280",
            background: "#f3f4f6",
            border: "2px solid #e5e7eb",
            borderRadius: 12,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px 24px",
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            background: loading
              ? "#9ca3af"
              : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            border: "none",
            borderRadius: 12,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "transform 0.15s, box-shadow 0.15s",
            boxShadow: loading
              ? "none"
              : "0 4px 14px rgba(99, 102, 241, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(99, 102, 241, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = loading
              ? "none"
              : "0 4px 14px rgba(99, 102, 241, 0.4)";
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 18,
                  border: "2.5px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Creating...
            </>
          ) : (
            "Business Banao →"
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
