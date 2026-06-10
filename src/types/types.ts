export interface ParsedLead {
  name: string;
  phone: string | null;
  need: string | null;
  budget: number | null;
  followUpDays: number | null;
}

export interface WhatsAppMessage {
  from: string;
  body: string;
  timestamp: string;
  messageId: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface OnboardFormData {
  name: string;
  ownerName: string;
  whatsappNumber: string;
  category: string;
  plan: string;
}
