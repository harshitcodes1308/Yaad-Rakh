"use client";

import React from "react";

interface StepBusinessInfoProps {
  data: {
    name: string;
    ownerName: string;
    whatsappNumber: string;
    category: string;
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}

const CATEGORIES = [
  { value: "", label: "Category chunein..." },
  { value: "clothing", label: "🛍️ Clothing Store" },
  { value: "coaching", label: "📚 Coaching Center" },
  { value: "boutique", label: "✂️ Boutique / Tailor" },
  { value: "service", label: "🔧 Local Service (AC, Plumber, etc.)" },
  { value: "ca", label: "📊 CA / Consultant" },
  { value: "other", label: "🏪 Other" },
];

export default function StepBusinessInfo({
  data,
  onChange,
  onNext,
}: StepBusinessInfoProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!data.name.trim()) {
      newErrors.name = "Business name zaroori hai";
    }

    if (!data.whatsappNumber.trim()) {
      newErrors.whatsappNumber = "WhatsApp number zaroori hai";
    } else {
      const cleaned = data.whatsappNumber.replace(/[\s\-+]/g, "");
      if (!/^\d{10,13}$/.test(cleaned)) {
        newErrors.whatsappNumber = "Sahi phone number daalein (10 digits)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1a1a2e",
            margin: "0 0 4px 0",
          }}
        >
          📋 Business Details
        </h2>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
          Client ki basic info bharein
        </p>
      </div>

      {/* Business Name */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontWeight: 600,
            fontSize: 14,
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Business Name *
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. Sharma Garments"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: 15,
            border: errors.name ? "2px solid #ef4444" : "2px solid #e5e7eb",
            borderRadius: 10,
            outline: "none",
            transition: "border-color 0.2s",
            boxSizing: "border-box",
            backgroundColor: "#fafafa",
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = "#6366f1")
          }
          onBlur={(e) =>
            (e.target.style.borderColor = errors.name
              ? "#ef4444"
              : "#e5e7eb")
          }
        />
        {errors.name && (
          <p style={{ color: "#ef4444", fontSize: 13, margin: "4px 0 0" }}>
            {errors.name}
          </p>
        )}
      </div>

      {/* Owner Name */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontWeight: 600,
            fontSize: 14,
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Owner Name
        </label>
        <input
          type="text"
          value={data.ownerName}
          onChange={(e) => onChange("ownerName", e.target.value)}
          placeholder="e.g. Rajesh Sharma"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: 15,
            border: "2px solid #e5e7eb",
            borderRadius: 10,
            outline: "none",
            transition: "border-color 0.2s",
            boxSizing: "border-box",
            backgroundColor: "#fafafa",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
      </div>

      {/* WhatsApp Number */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontWeight: 600,
            fontSize: 14,
            color: "#374151",
            marginBottom: 6,
          }}
        >
          WhatsApp Number *
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              background: "#f3f4f6",
              borderRadius: 10,
              fontWeight: 600,
              color: "#6b7280",
              fontSize: 15,
              border: "2px solid #e5e7eb",
            }}
          >
            +91
          </span>
          <input
            type="tel"
            value={data.whatsappNumber}
            onChange={(e) => onChange("whatsappNumber", e.target.value)}
            placeholder="9876543210"
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: 15,
              border: errors.whatsappNumber
                ? "2px solid #ef4444"
                : "2px solid #e5e7eb",
              borderRadius: 10,
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
              backgroundColor: "#fafafa",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e) =>
              (e.target.style.borderColor = errors.whatsappNumber
                ? "#ef4444"
                : "#e5e7eb")
            }
          />
        </div>
        {errors.whatsappNumber && (
          <p style={{ color: "#ef4444", fontSize: 13, margin: "4px 0 0" }}>
            {errors.whatsappNumber}
          </p>
        )}
      </div>

      {/* Category */}
      <div style={{ marginBottom: 28 }}>
        <label
          style={{
            display: "block",
            fontWeight: 600,
            fontSize: 14,
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Business Category
        </label>
        <select
          value={data.category}
          onChange={(e) => onChange("category", e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: 15,
            border: "2px solid #e5e7eb",
            borderRadius: 10,
            outline: "none",
            backgroundColor: "#fafafa",
            cursor: "pointer",
            boxSizing: "border-box",
            appearance: "none",
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Next Button */}
      <button
        type="submit"
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
        Aage Badhein →
      </button>
    </form>
  );
}
