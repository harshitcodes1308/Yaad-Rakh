import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseLeadMessage, classifyAndParseMessage } from "@/lib/openai";
import { sendTextMessage, sendInteractiveMessage, addMockIncomingLog } from "@/lib/whatsapp";
import { WhatsAppWebhookPayload } from "@/types/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/incoming
 * Webhook verification (Meta / 360dialog challenge-response)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[Webhook] Verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/whatsapp/incoming
 * Receives incoming WhatsApp messages from 360dialog webhook.
 * This is the core orchestrator for the CRM:
 *   incoming message → GPT classify → route to sub-handlers → reply
 */
export async function POST(request: NextRequest) {
  try {
    const payload: WhatsAppWebhookPayload = await request.json();

    // Extract message from webhook payload
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const messageData = change?.value?.messages?.[0];

    if (!messageData) {
      // Not a message - acknowledge but don't process
      return NextResponse.json({ status: "ignored" });
    }

    const senderPhone = messageData.from;

    // Check if the message is interactive or text
    let messageBody = "";
    let buttonReplyId = "";

    if (messageData.type === "text" && messageData.text) {
      messageBody = messageData.text.body;
    } else if (messageData.type === "interactive" && (messageData as any).interactive) {
      const interactive = (messageData as any).interactive;
      if (interactive.type === "button_reply" && interactive.button_reply) {
        buttonReplyId = interactive.button_reply.id;
        messageBody = interactive.button_reply.title;
      }
    }

    if (!messageBody && !buttonReplyId) {
      return NextResponse.json({ status: "no_valid_content" });
    }

    console.log(`[Webhook] Message from ${senderPhone}: body="${messageBody}" replyId="${buttonReplyId}"`);

    // 1. Look up the business by sender's WhatsApp number
    const business = await prisma.business.findFirst({
      where: {
        OR: [
          { whatsappNumber: senderPhone },
          { whatsappNumber: `+${senderPhone}` },
        ],
      },
    });

    if (!business) {
      console.log(`[Webhook] Unknown sender: ${senderPhone}`);
      await sendTextMessage(
        senderPhone,
        "Yaad Rakh mein aapka account nahi mila. Pehle onboarding portal par register karwayein! 🙏"
      );
      return NextResponse.json({ status: "unknown_sender" });
    }

    // Determine the intent. If buttonReplyId starts with a known prefix (e.g. "deal_", "rem_"), map it directly.
    let intent = "";
    let parsedData: any = {};

    if (buttonReplyId) {
      if (buttonReplyId.startsWith("deal_")) {
        // format: "deal_<customerId>_<option>"
        intent = "DEAL_PIPELINE_REPLY";
        const parts = buttonReplyId.split("_");
        parsedData = {
          customerId: parts[1],
          option: parseInt(parts[2]),
        };
      } else if (buttonReplyId.startsWith("rem_")) {
        // format: "rem_<reminderId>_<action>"
        intent = "REMINDER_ACTION";
        const parts = buttonReplyId.split("_");
        parsedData = {
          reminderId: parts[1],
          action: parts[2],
        };
      }
    }

    // Fallback: If no interactive button matched, check for keyboard shortcuts or run AI classifier
    if (!intent) {
      const trimmedBody = messageBody.trim();
      // Check if it's a numeric reply to the last sent reminder (1-4)
      if (/^[1-4]$/.test(trimmedBody)) {
        const lastSentReminder = await prisma.reminder.findFirst({
          where: {
            customer: { businessId: business.id },
            status: "sent",
          },
          orderBy: { dueDate: "desc" },
        });

        if (lastSentReminder) {
          intent = "DEAL_PIPELINE_REPLY";
          parsedData = {
            customerId: lastSentReminder.customerId,
            option: parseInt(trimmedBody),
            reminderId: lastSentReminder.id,
          };
        }
      } else if (trimmedBody.toLowerCase() === "done") {
        const lastSentReminder = await prisma.reminder.findFirst({
          where: {
            customer: { businessId: business.id },
            status: "sent",
          },
          orderBy: { dueDate: "desc" },
        });

        if (lastSentReminder) {
          intent = "REMINDER_ACTION";
          parsedData = {
            reminderId: lastSentReminder.id,
            action: "done",
          };
        }
      }
    }

    // Use AI classifier to identify intent and parse parameters
    if (!intent) {
      const classification = await classifyAndParseMessage(messageBody);
      intent = classification.intent;
      parsedData = classification.data;
    }

    console.log(`[Webhook] Processed Intent: ${intent}`, parsedData);

    // Log incoming webhook event for simulator
    addMockIncomingLog({
      id: `incoming_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from: senderPhone,
      content: messageBody,
      intent,
      parsedData,
      timestamp: new Date().toISOString(),
    });

    let replyMessage = "";

    switch (intent) {
      case "NEW_LEAD": {
        const { name, phone, need, budget, followUpDays } = parsedData;

        if (!name) {
          replyMessage = "Mujhe customer ka naam nahi mila. Please try again! Example: 'Raj, 98765XXXXX, website banana hai'";
          break;
        }

        // Create customer
        const customer = await prisma.customer.create({
          data: {
            businessId: business.id,
            name,
            phone: phone || null,
            need: need || null,
            budget: budget ? Number(budget) : null,
            stage: "new",
          },
        });

        // Create initial interaction
        await prisma.interaction.create({
          data: {
            customerId: customer.id,
            notes: messageBody,
            outcome: "lead_saved",
          },
        });

        let reminderText = "";
        if (followUpDays && Number(followUpDays) > 0) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + Number(followUpDays));

          await prisma.reminder.create({
            data: {
              customerId: customer.id,
              dueDate,
              status: "pending",
              message: `Follow up with ${name}${need ? ` about ${need}` : ""}${budget ? ` (Budget: ₹${Number(budget).toLocaleString("en-IN")})` : ""}`,
            },
          });

          reminderText = `\n📅 Follow-up set for ${followUpDays} din baad!`;
        }

        const budgetStr = budget
          ? `💰 Budget: ₹${Number(budget).toLocaleString("en-IN")}`
          : "";
        const needStr = need ? `📋 Need: ${need}` : "";
        const phoneStr = phone ? `📞 Phone: ${phone}` : "";

        const confirmationParts = [
          `✅ ${name} save ho gaya!`,
          phoneStr,
          needStr,
          budgetStr,
          reminderText,
        ].filter(Boolean);

        replyMessage = confirmationParts.join("\n");

        if (!followUpDays) {
          replyMessage += "\n\n⏰ Follow-up kab karein? (e.g. 2 din, 1 hafta)";
        }
        break;
      }

      case "SET_REMINDER": {
        const { followUpDays } = parsedData;

        if (!followUpDays || Number(followUpDays) <= 0) {
          replyMessage = "Mujhe follow-up timing samajh nahi aayi. Example: '2 din baad' or '1 hafta'.";
          break;
        }

        // Find the last customer created in the last 15 minutes that has NO reminders
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const lastCustomer = await prisma.customer.findFirst({
          where: {
            businessId: business.id,
            createdAt: { gte: fifteenMinutesAgo },
            reminders: { none: {} },
          },
          orderBy: { createdAt: "desc" },
        });

        if (lastCustomer) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + Number(followUpDays));

          await prisma.reminder.create({
            data: {
              customerId: lastCustomer.id,
              dueDate,
              status: "pending",
              message: `Follow up with ${lastCustomer.name}${lastCustomer.need ? ` about ${lastCustomer.need}` : ""}${lastCustomer.budget ? ` (Budget: ₹${Number(lastCustomer.budget).toLocaleString("en-IN")})` : ""}`,
            },
          });

          replyMessage = `📅 ${lastCustomer.name} ke liye follow-up ${followUpDays} din baad set ho gaya hai!`;
        } else {
          // Fallback: Check if there's any customer created recently, even if they have reminders
          const lastCustomerAny = await prisma.customer.findFirst({
            where: { businessId: business.id },
            orderBy: { createdAt: "desc" },
          });

          if (lastCustomerAny) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + Number(followUpDays));

            await prisma.reminder.create({
              data: {
                customerId: lastCustomerAny.id,
                dueDate,
                status: "pending",
                message: `Follow up with ${lastCustomerAny.name}`,
              },
            });

            replyMessage = `📅 ${lastCustomerAny.name} ke liye naya follow-up ${followUpDays} din baad set ho gaya hai!`;
          } else {
            replyMessage = "Pehle customer save karein, fir follow-up time set karein! 🙏";
          }
        }
        break;
      }

      case "RECORD_PAYMENT": {
        const { customerName, amount, type } = parsedData;

        if (!customerName || !amount) {
          replyMessage = "Mujhe payment details clear nahi mili. Example: 'Meena ka 5000 baaki hai' or 'Ramesh ne 3000 diya aaj'.";
          break;
        }

        // Look up customer by name (fuzzy match)
        let customer = await prisma.customer.findFirst({
          where: {
            businessId: business.id,
            name: { contains: customerName },
          },
        });

        // Create if doesn't exist
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              businessId: business.id,
              name: customerName,
              stage: "interested",
            },
          });
        }

        // Create payment
        await prisma.payment.create({
          data: {
            customerId: customer.id,
            amount: Number(amount),
            status: type === "paid" ? "paid" : "pending",
            notes: messageBody,
          },
        });

        // Record interaction
        await prisma.interaction.create({
          data: {
            customerId: customer.id,
            notes: messageBody,
            outcome: "payment_recorded",
          },
        });

        if (type === "paid") {
          replyMessage = `✅ ${customer.name} se ₹${Number(amount).toLocaleString("en-IN")} mil gaye hain. Payment record update ho gaya hai!`;
        } else {
          replyMessage = `✅ ${customer.name} ka ₹${Number(amount).toLocaleString("en-IN")} baaki hai. Balance record kar liya hai!`;
        }
        break;
      }

      case "RECORD_UDHARI": {
        const { customerName, amount, type } = parsedData;

        let targetCustomer = null;

        if (customerName) {
          targetCustomer = await prisma.customer.findFirst({
            where: {
              businessId: business.id,
              name: { contains: customerName },
            },
          });

          // Create if doesn't exist
          if (!targetCustomer && (type === "udhari" || type === "repayment")) {
            targetCustomer = await prisma.customer.create({
              data: {
                businessId: business.id,
                name: customerName,
                stage: "interested",
              },
            });
          }
        } else {
          // Fallback: Find the customer of the last sent reminder to this business
          const lastSentReminder = await prisma.reminder.findFirst({
            where: {
              customer: { businessId: business.id },
              status: "sent",
            },
            orderBy: { dueDate: "desc" },
            include: { customer: true },
          });
          
          if (lastSentReminder) {
            targetCustomer = lastSentReminder.customer;
          } else {
            // Fallback to the most recent customer added/updated
            targetCustomer = await prisma.customer.findFirst({
              where: { businessId: business.id },
              orderBy: { updatedAt: "desc" },
            });
          }
        }

        if (!targetCustomer) {
          replyMessage = "Mujhe customer ka naam nahi mila. Please try again! Example: 'Anushree ne 200 udhari li' or 'Rohit ne 500 wapas kar diye'";
          break;
        }

        if (type === "udhari") {
          if (!amount) {
            replyMessage = "Mujhe credit amount samajh nahi aaya. Please try again! Example: 'Anushree ne 200 udhari li'";
            break;
          }

          // Create pending udhari payment
          await prisma.payment.create({
            data: {
              customerId: targetCustomer.id,
              amount: Number(amount),
              status: "pending",
              type: "udhari",
              notes: messageBody,
            },
          });

          await prisma.interaction.create({
            data: {
              customerId: targetCustomer.id,
              notes: messageBody,
              outcome: "udhari_recorded",
            },
          });

          replyMessage = `✅ ${targetCustomer.name} ka ₹${Number(amount).toLocaleString("en-IN")} udhari record kar liya hai. (Status: pending)`;
        } else if (type === "repayment") {
          if (!amount) {
            replyMessage = "Mujhe repayment amount samajh nahi aaya. Please try again! Example: 'Rohit ne 500 wapas kar diye'";
            break;
          }

          // 1. Create a paid repayment record
          await prisma.payment.create({
            data: {
              customerId: targetCustomer.id,
              amount: Number(amount),
              status: "paid",
              type: "repayment",
              notes: `Repayment: ${messageBody}`,
            },
          });

          // 2. FIFO Settle pending payments
          let remainingRepayment = Number(amount);
          const pendingPayments = await prisma.payment.findMany({
            where: { customerId: targetCustomer.id, status: "pending" },
            orderBy: { createdAt: "asc" },
          });

          for (const p of pendingPayments) {
            if (remainingRepayment <= 0) break;
            if (remainingRepayment >= p.amount) {
              remainingRepayment -= p.amount;
              await prisma.payment.update({
                where: { id: p.id },
                data: { status: "paid" },
              });
            } else {
              await prisma.payment.update({
                where: { id: p.id },
                data: { amount: p.amount - remainingRepayment },
              });
              remainingRepayment = 0;
            }
          }

          await prisma.interaction.create({
            data: {
              customerId: targetCustomer.id,
              notes: messageBody,
              outcome: "repayment_recorded",
            },
          });

          replyMessage = `✅ ${targetCustomer.name} se ₹${Number(amount).toLocaleString("en-IN")} repayment mil gaya hai. Hisab update kar diya hai!`;
        } else if (type === "full_repayment") {
          const pendingPayments = await prisma.payment.findMany({
            where: { customerId: targetCustomer.id, status: "pending" },
          });

          const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

          if (totalPending > 0) {
            // Log full repayment payment record
            await prisma.payment.create({
              data: {
                customerId: targetCustomer.id,
                amount: totalPending,
                status: "paid",
                type: "repayment",
                notes: `Full repayment: ${messageBody}`,
              },
            });

            // Mark all pending as paid
            await prisma.payment.updateMany({
              where: { customerId: targetCustomer.id, status: "pending" },
              data: { status: "paid" },
            });

            await prisma.interaction.create({
              data: {
                customerId: targetCustomer.id,
                notes: messageBody,
                outcome: "full_repayment_recorded",
              },
            });

            replyMessage = `✅ Badhiya! ${targetCustomer.name} ne saare paise (₹${totalPending.toLocaleString("en-IN")}) wapas kar diye hain. Pending hisab clear ho gaya hai! 🎉`;
          } else {
            replyMessage = `👍 ${targetCustomer.name} ka koi pending udhari nahi hai.`;
          }
        } else if (type === "partial_repayment") {
          const pendingPayments = await prisma.payment.findMany({
            where: { customerId: targetCustomer.id, status: "pending" },
          });

          const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

          if (totalPending > 0) {
            const repaidAmount = totalPending * 0.5;

            // Log partial repayment
            await prisma.payment.create({
              data: {
                customerId: targetCustomer.id,
                amount: repaidAmount,
                status: "paid",
                type: "repayment",
                notes: `Partial repayment (50%): ${messageBody}`,
              },
            });

            // Mark all original pending as paid
            await prisma.payment.updateMany({
              where: { customerId: targetCustomer.id, status: "pending" },
              data: { status: "paid" },
            });

            // Create new pending entry for remaining 50%
            await prisma.payment.create({
              data: {
                customerId: targetCustomer.id,
                amount: repaidAmount,
                status: "pending",
                type: "udhari",
                notes: `Remaining 50% balance after partial repayment of ₹${repaidAmount}`,
              },
            });

            await prisma.interaction.create({
              data: {
                customerId: targetCustomer.id,
                notes: messageBody,
                outcome: "partial_repayment_recorded",
              },
            });

            replyMessage = `✅ ${targetCustomer.name} ne aadhe paise (₹${repaidAmount.toLocaleString("en-IN")}) wapas kar diye hain. Remaining ₹${repaidAmount.toLocaleString("en-IN")} pending mein record kar liya hai.`;
          } else {
            replyMessage = `👍 ${targetCustomer.name} ka koi pending udhari nahi hai.`;
          }
        }
        break;
      }

      case "LIST_UDHARI": {
        const { customerName } = parsedData;

        if (customerName) {
          const targetCustomer = await prisma.customer.findFirst({
            where: {
              businessId: business.id,
              name: { contains: customerName },
            },
          });

          if (!targetCustomer) {
            replyMessage = `❌ "${customerName}" naam ka koi customer nahi mila.`;
            break;
          }

          const pendingPayments = await prisma.payment.findMany({
            where: { customerId: targetCustomer.id, status: "pending" },
          });

          const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

          if (totalPending > 0) {
            replyMessage = `👤 *${targetCustomer.name}* ka total outstanding balance *₹${totalPending.toLocaleString("en-IN")}* pending hai.`;
          } else {
            replyMessage = `👤 *${targetCustomer.name}* ka saara hisab clear hai! Zero pending balance. 👍`;
          }
        } else {
          // List all
          const customers = await prisma.customer.findMany({
            where: { businessId: business.id },
            include: {
              payments: {
                where: { status: "pending" },
              },
            },
          });

          const debtors = customers
            .map((c) => {
              const balance = c.payments.reduce((sum, p) => sum + p.amount, 0);
              return { name: c.name, balance };
            })
            .filter((d) => d.balance > 0);

          if (debtors.length > 0) {
            const totalOutstanding = debtors.reduce((sum, d) => sum + d.balance, 0);
            const lines = [
              "📋 *Outstanding Udhari List:*",
              "",
              ...debtors.map((d) => `• *${d.name}*: ₹${d.balance.toLocaleString("en-IN")}`),
              "",
              `📊 *Total Outstanding*: *₹${totalOutstanding.toLocaleString("en-IN")}*`,
            ];
            replyMessage = lines.join("\n");
          } else {
            replyMessage = "🎉 Sabka hisab clear hai! Business ka koi payment pending nahi hai.";
          }
        }
        break;
      }

      case "DEAL_PIPELINE_REPLY": {
        const { customerId, option, reminderId } = parsedData;

        let targetCustomerId = customerId;
        let targetReminderId = reminderId;

        if (!targetCustomerId) {
          const lastSentReminder = await prisma.reminder.findFirst({
            where: {
              customer: { businessId: business.id },
              status: "sent",
            },
            orderBy: { dueDate: "desc" },
          });

          if (lastSentReminder) {
            targetCustomerId = lastSentReminder.customerId;
            targetReminderId = lastSentReminder.id;
          }
        }

        if (!targetCustomerId) {
          replyMessage = "Mujhe recent follow-up reminder nahi mila jiska response diya ja sake. 🙏";
          break;
        }

        const customer = await prisma.customer.findUnique({
          where: { id: targetCustomerId },
        });

        if (!customer) {
          replyMessage = "Customer record nahi mila. 😞";
          break;
        }

        let newStage = "interested";
        let statusMsg = "";

        if (option === 1) {
          newStage = "won";
          statusMsg = "Deal pakka! 🎉 Badhai ho!";
        } else if (option === 2) {
          newStage = "negotiating";
          statusMsg = "Negotiating stage set. Achhe se follow-up karte rahein! 👍";
        } else if (option === 3) {
          newStage = "lost";
          statusMsg = "Lost stage set. Next deal par focus karein! 💪";
        } else if (option === 4) {
          newStage = "negotiating";
          statusMsg = "Baad mein follow-up karenge.";

          const snoozeDate = new Date();
          snoozeDate.setDate(snoozeDate.getDate() + 3);

          if (targetReminderId) {
            await prisma.reminder.update({
              where: { id: targetReminderId },
              data: {
                dueDate: snoozeDate,
                status: "pending",
              },
            });
            statusMsg += " Follow-up 3 din baad ke liye reschedule kar diya hai. 📅";
          }
        }

        // Update stage
        await prisma.customer.update({
          where: { id: targetCustomerId },
          data: { stage: newStage },
        });

        // Mark reminder as done
        if (targetReminderId && option !== 4) {
          await prisma.reminder.update({
            where: { id: targetReminderId },
            data: { status: "done" },
          });
        }

        // Record interaction
        await prisma.interaction.create({
          data: {
            customerId: targetCustomerId,
            notes: `Deal pipeline reply: Option ${option} (${messageBody})`,
            outcome: `stage_updated_${newStage}`,
          },
        });

        replyMessage = `✅ ${customer.name} ka status updated: ${statusMsg}`;
        break;
      }

      case "REMINDER_ACTION": {
        const { reminderId, action } = parsedData;

        let targetReminderId = reminderId;

        if (!targetReminderId) {
          const lastSentReminder = await prisma.reminder.findFirst({
            where: {
              customer: { businessId: business.id },
              status: "sent",
            },
            orderBy: { dueDate: "desc" },
          });

          if (lastSentReminder) {
            targetReminderId = lastSentReminder.id;
          }
        }

        if (!targetReminderId) {
          replyMessage = "Mujhe koi active reminder nahi mila. 🙏";
          break;
        }

        const reminder = await prisma.reminder.findUnique({
          where: { id: targetReminderId },
          include: { customer: true },
        });

        if (!reminder) {
          replyMessage = "Reminder record nahi mila. 😞";
          break;
        }

        if (action === "done") {
          await prisma.reminder.update({
            where: { id: targetReminderId },
            data: { status: "done" },
          });

          await prisma.customer.update({
            where: { id: reminder.customerId },
            data: { stage: "won" },
          });

          replyMessage = `✅ Badhiya! ${reminder.customer.name} ka task completed mark kar diya hai aur stage WON ho gaya hai! 🎉`;
        } else if (action === "snooze" || action === "later") {
          const newDueDate = new Date();
          newDueDate.setDate(newDueDate.getDate() + 3);

          await prisma.reminder.update({
            where: { id: targetReminderId },
            data: {
              status: "pending",
              dueDate: newDueDate,
            },
          });

          replyMessage = `📅 Follow-up 3 din baad (${newDueDate.toLocaleDateString("en-IN")}) ke liye reschedule ho gaya hai.`;
        }
        break;
      }

      case "BULK_MESSAGE": {
        if (business.plan !== "pro") {
          replyMessage = "❌ Tyohar Bulk Message Sender sirf Pro plan members ke liye hai. Upgrade karne ke liye support ko message karein! 💎";
          break;
        }

        const { query, targetStage, messageType, messageText } = parsedData;

        // Filter by stage if targetStage is provided and not "all"
        const whereClause: any = { businessId: business.id };
        if (targetStage && targetStage !== "all") {
          whereClause.stage = targetStage;
        }

        const customers = await prisma.customer.findMany({
          where: whereClause,
        });

        if (customers.length === 0) {
          replyMessage = `Aapke paas koi customers nahi hain ${targetStage && targetStage !== "all" ? `stage "${targetStage}" mein ` : ""}jinhe bulk message bheja ja sake.`;
          break;
        }

        let successCount = 0;
        const msgType = messageType || "festival";
        const msgContent = messageText || query || "Tyohar";

        for (const cust of customers) {
          let greeting = "";
          if (msgType === "festival") {
            greeting = `Happy ${msgContent} ${cust.name} ji! ${business.name} ki taraf se shubhkamnayein! Naya collection aa gaya hai — zaroor aayein!`;
          } else if (msgType === "announcement") {
            greeting = `📢 *Announcement from ${business.name}:* Hello ${cust.name} ji, ${msgContent}!`;
          } else {
            // custom message with [name] replacement
            greeting = msgContent.replace(/\[name\]/gi, cust.name).replace(/\[customerName\]/gi, cust.name);
          }

          await sendTextMessage(cust.phone || "919999999999", greeting);
          successCount++;
        }

        replyMessage = `🚀 Bulk message (${msgType}) successfully sent to ${successCount} customers ${targetStage && targetStage !== "all" ? `in stage "${targetStage}"` : "in total"}!`;
        break;
      }

      case "CREATE_INVOICE": {
        const { customerName, amount, item } = parsedData;

        if (!customerName || !amount) {
          replyMessage = "Mujhe invoice details clear nahi mili. Example: 'Rahul digital bill of 1500 for tshirts'.";
          break;
        }

        let customer = await prisma.customer.findFirst({
          where: {
            businessId: business.id,
            name: { contains: customerName },
          },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              businessId: business.id,
              name: customerName,
              stage: "interested",
            },
          });
        }

        const payment = await prisma.payment.create({
          data: {
            customerId: customer.id,
            amount: Number(amount),
            status: "pending",
            type: "udhari",
            notes: `Digital Bill: ${item || "Items"}`,
          },
        });

        await prisma.interaction.create({
          data: {
            customerId: customer.id,
            notes: `Digital Bill Generated for ${item || "Items"} of amount ₹${amount}`,
            outcome: "invoice_generated",
          },
        });

        const invoiceId = payment.id;
        const mockBillLink = `https://yaad-rakh.com/bill/${invoiceId}`;
        
        // Also send the actual invoice to the customer's phone so it appears on the receiver console
        const customerInvoiceMsg = `Hello ${customer.name} ji, aapka *${item || "General Purchase"}* ka bill generate ho gaya hai: *₹${Number(amount).toLocaleString("en-IN")}*.\nStatus: *PENDING*\n\n🔗 *Pay Online:* ${mockBillLink}\n\nThanks for shopping with *${business.name}*!`;
        await sendTextMessage(customer.phone || "919999999999", customerInvoiceMsg);

        replyMessage = `📄 *Digital Bill / Invoice Generated*
👤 *Customer:* ${customer.name}
📦 *Item:* ${item || "General Purchase"}
💰 *Amount:* ₹${Number(amount).toLocaleString("en-IN")}
Status: *PENDING*

🔗 *View Invoice / Pay Online:* ${mockBillLink}

We have simulated sending this bill to ${customer.name} over WhatsApp! 🚀`;
        break;
      }

      case "LOG_ATTENDANCE": {
        const { staffName, type } = parsedData;
        const actionType = type || "login";
        const nameToUse = `Staff: ${staffName || "General Staff"}`;

        let customer = await prisma.customer.findFirst({
          where: {
            businessId: business.id,
            name: nameToUse,
          },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              businessId: business.id,
              name: nameToUse,
              stage: "new",
            },
          });
        }

        await prisma.interaction.create({
          data: {
            customerId: customer.id,
            notes: `Staff punch ${actionType} logged.`,
            outcome: `attendance_${actionType}`,
          },
        });

        const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        replyMessage = `⏰ *Staff Attendance Logged*
👤 *Staff Member:* ${staffName || "General Staff"}
🔔 *Action:* Punch-${actionType.toUpperCase()}
🕒 *Time:* ${timeStr}

Daily attendance records updated successfully!`;
        break;
      }

      case "BUSINESS_STATS": {
        const totalCusts = await prisma.customer.count({
          where: { businessId: business.id },
        });

        const stageCounts = await prisma.customer.groupBy({
          by: ["stage"],
          where: { businessId: business.id },
          _count: { id: true },
        });

        const pendingPayments = await prisma.payment.findMany({
          where: {
            customer: { businessId: business.id },
            status: "pending",
          },
        });
        const totalOwed = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const staffLogs = await prisma.interaction.findMany({
          where: {
            customer: { businessId: business.id },
            outcome: { startsWith: "attendance_" },
            interactionDate: { gte: todayStart },
          },
          include: { customer: true },
          orderBy: { interactionDate: "desc" },
        });

        const stages = { new: 0, interested: 0, negotiating: 0, won: 0, lost: 0 };
        stageCounts.forEach((s) => {
          if (s.stage in stages) {
            (stages as any)[s.stage] = s._count.id;
          }
        });

        const attendanceList = staffLogs.length === 0
          ? "No login/logout records logged today."
          : staffLogs
              .map((log) => {
                const staff = log.customer.name.replace("Staff: ", "");
                const action = log.outcome === "attendance_login" ? "In" : "Out";
                const time = new Date(log.interactionDate).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return `• ${staff}: Punch-${action} at ${time}`;
              })
              .join("\n");

        replyMessage = `📊 *Yaad Rakh Business Stats Dashboard*
🏢 *Business:* ${business.name}
━━━━━━━━━━━━━━━━━━━
👥 *Total Contacts:* ${totalCusts}
  • Won Deals: ${stages.won} 🎉
  • In Negotiation: ${stages.negotiating}
  • Interested: ${stages.interested}
  • New Enquiries: ${stages.new}
  • Lost: ${stages.lost}

💸 *Outstanding Udhari:* ₹${totalOwed.toLocaleString("en-IN")}

⏰ *Today's Staff Logins:*
${attendanceList}
━━━━━━━━━━━━━━━━━━━`;
        break;
      }

      default: {
        replyMessage = "Samajh nahi aaya. Please try again! Aap naya lead save kar sakte hain ya payment record kar sakte hain. 🙏";
        break;
      }
    }

    await sendTextMessage(senderPhone, replyMessage);

    return NextResponse.json({
      status: "processed",
      intent,
    });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
