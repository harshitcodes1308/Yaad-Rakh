"use client";

import React, { useState } from "react";
import StepBusinessInfo from "@/components/onboard/StepBusinessInfo";
import StepPlanSelect from "@/components/onboard/StepPlanSelect";
import StepSuccess from "@/components/onboard/StepSuccess";

interface FormData {
  name: string;
  ownerName: string;
  whatsappNumber: string;
  category: string;
  plan: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  ownerName: "",
  whatsappNumber: "",
  category: "",
  plan: "free",
};

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botNumber, setBotNumber] = useState("");

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/businesses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kuch gadbad ho gayi");
      }

      setBotNumber(data.business.botNumber);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setStep(1);
    setError(null);
    setBotNumber("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #e0e7ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
        }}
      >
        {/* Logo / Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>🧠</span>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                margin: 0,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Yaad Rakh
            </h1>
          </div>
          <p
            style={{
              color: "#6b7280",
              fontSize: 14,
              margin: 0,
              fontWeight: 500,
            }}
          >
            Client Onboarding Portal
          </p>
        </div>

        {/* Step Indicator */}
        {step < 3 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: step >= s ? "#fff" : "#9ca3af",
                    background:
                      step >= s
                        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                        : "#e5e7eb",
                    transition: "all 0.3s",
                  }}
                >
                  {step > s ? "✓" : s}
                </div>
                {s < 2 && (
                  <div
                    style={{
                      width: 60,
                      height: 3,
                      borderRadius: 2,
                      background: step > 1 ? "#6366f1" : "#e5e7eb",
                      transition: "background 0.3s",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Form Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "32px 28px",
            boxShadow:
              "0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -4px rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.08)",
          }}
        >
          {/* Error Banner */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {step === 1 && (
            <StepBusinessInfo
              data={formData}
              onChange={handleFieldChange}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepPlanSelect
              selectedPlan={formData.plan}
              onPlanChange={(plan) => handleFieldChange("plan", plan)}
              onSubmit={handleSubmit}
              onBack={() => setStep(1)}
              loading={loading}
            />
          )}

          {step === 3 && (
            <StepSuccess
              businessName={formData.name}
              botNumber={botNumber}
              plan={formData.plan}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 12,
            marginTop: 20,
            fontWeight: 500,
          }}
        >
          Yaad Rakh CRM • Internal Tool
        </p>
      </div>
    </div>
  );
}
