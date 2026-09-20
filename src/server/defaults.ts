import type { LeadStatusValue } from "@prisma/client";

export const DEFAULT_PIPELINE_STAGES: Array<{
  name: string;
  status: LeadStatusValue;
  color: string;
}> = [
  { name: "New", status: "NEW", color: "#f97316" },
  { name: "Qualified", status: "QUALIFIED", color: "#3b82f6" },
  { name: "Hot", status: "HOT", color: "#ef4444" },
  { name: "Follow-up", status: "FOLLOW_UP", color: "#eab308" },
  { name: "Hold", status: "HOLD", color: "#94a3b8" },
  { name: "Sale", status: "SALE", color: "#22c55e" },
  { name: "Lost", status: "LOST", color: "#64748b" },
];

export const DEFAULT_TRIAL_PLAN_CODE = "free_trial";

export const DEFAULT_PLANS = [
  {
    code: "free_trial",
    name: "Free Trial",
    price: 0,
    currency: "INR",
    billingInterval: "MONTHLY" as const,
    trialDays: 14,
    maxUsers: 3,
    maxLeads: 200,
    maxMessages: 500,
    maxStorageMb: 500,
    features: { whatsapp: true, facebook: true, instagram: true, gmail: true, campaigns: true, apiAccess: false, automation: false, aiAssistant: false, advancedReports: false },
    sortOrder: 0,
  },
  {
    code: "starter",
    name: "Starter",
    price: 1499,
    currency: "INR",
    billingInterval: "MONTHLY" as const,
    trialDays: 14,
    maxUsers: 5,
    maxLeads: 2000,
    maxMessages: 5000,
    maxStorageMb: 2000,
    features: { whatsapp: true, facebook: true, instagram: true, gmail: true, campaigns: true, apiAccess: false, automation: false, aiAssistant: false, advancedReports: false },
    sortOrder: 1,
  },
  {
    code: "growth",
    name: "Growth",
    price: 4999,
    currency: "INR",
    billingInterval: "MONTHLY" as const,
    trialDays: 14,
    maxUsers: 15,
    maxLeads: 10000,
    maxMessages: 25000,
    maxStorageMb: 10000,
    features: { whatsapp: true, facebook: true, instagram: true, gmail: true, campaigns: true, apiAccess: true, automation: true, aiAssistant: false, advancedReports: true },
    sortOrder: 2,
  },
  {
    code: "business",
    name: "Business",
    price: 12999,
    currency: "INR",
    billingInterval: "MONTHLY" as const,
    trialDays: 14,
    maxUsers: 50,
    maxLeads: 50000,
    maxMessages: 100000,
    maxStorageMb: 50000,
    features: { whatsapp: true, facebook: true, instagram: true, gmail: true, campaigns: true, apiAccess: true, automation: true, aiAssistant: true, advancedReports: true },
    sortOrder: 3,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: 29999,
    currency: "INR",
    billingInterval: "MONTHLY" as const,
    trialDays: 30,
    maxUsers: 500,
    maxLeads: 500000,
    maxMessages: 1000000,
    maxStorageMb: 500000,
    features: { whatsapp: true, facebook: true, instagram: true, gmail: true, campaigns: true, apiAccess: true, automation: true, aiAssistant: true, advancedReports: true },
    sortOrder: 4,
  },
];
