"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { updateWorkspaceInfoAction, completeOnboardingAction } from "@/server/actions/onboarding";
import { inviteMemberAction } from "@/server/actions/team";
import { Check, MessageCircle, Share2, Camera, Mail, Globe } from "lucide-react";

const STEPS = ["Company", "Team size", "Invite team", "Lead sources", "Pipeline", "Integrations"];

const SOURCES = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "facebook", label: "Facebook", icon: Share2 },
  { key: "instagram", label: "Instagram", icon: Camera },
  { key: "gmail", label: "Gmail", icon: Mail },
  { key: "website", label: "Website", icon: Globe },
];

export function OnboardingWizard({ companyName, defaultStages }: { companyName: string; defaultStages: string[] }) {
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("1-5");
  const [sources, setSources] = useState<string[]>(["whatsapp", "manual"]);
  const [inviteState, inviteAction, invitePending] = useActionState(inviteMemberAction, null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function finish() {
    startTransition(async () => {
      await completeOnboardingAction();
      router.push("/dashboard");
    });
  }

  return (
    <Card className="p-8">
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < step ? "bg-success text-white" : i === step ? "bg-brand text-white" : "bg-muted-surface text-muted"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className="h-0.5 flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-lg font-semibold">Tell us about {companyName}</h2>
          <p className="mt-1 text-sm text-muted">This helps us tailor your workspace.</p>
          <div className="mt-6">
            <Label htmlFor="industry">Industry</Label>
            <Select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="">Select industry</option>
              {["Real Estate", "Education", "Healthcare", "E-commerce", "Financial Services", "Other"].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </Select>
          </div>
          <StepFooter onNext={next} nextLabel="Continue" />
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold">How big is your team?</h2>
          <div className="mt-6">
            <Label htmlFor="teamSize">Team size</Label>
            <Select id="teamSize" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
              {["1-5", "6-20", "21-50", "51-200", "200+"].map((s) => (
                <option key={s} value={s}>{s} people</option>
              ))}
            </Select>
          </div>
          <StepFooter
            onBack={back}
            onNext={() => {
              const fd = new FormData();
              fd.set("industry", industry);
              fd.set("teamSize", teamSize);
              startTransition(() => updateWorkspaceInfoAction(fd));
              next();
            }}
            nextLabel="Continue"
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold">Invite your team</h2>
          <p className="mt-1 text-sm text-muted">You can always invite more people later from Settings.</p>
          <form action={inviteAction} className="mt-6 flex gap-2">
            <Input name="email" type="email" placeholder="teammate@company.com" className="flex-1" />
            <Select name="role" className="w-40">
              <option value="SALES_AGENT">Sales Agent</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </Select>
            <Button type="submit" variant="secondary" disabled={invitePending}>Invite</Button>
          </form>
          {inviteState?.error && <p className="mt-2 text-sm text-danger">{inviteState.error}</p>}
          <StepFooter onBack={back} onNext={next} nextLabel="Continue" onSkip={next} />
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold">Where do your leads come from?</h2>
          <p className="mt-1 text-sm text-muted">Select the channels you plan to use.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SOURCES.map((s) => {
              const active = sources.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    setSources((cur) => (cur.includes(s.key) ? cur.filter((c) => c !== s.key) : [...cur, s.key]))
                  }
                  className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
                    active ? "border-brand bg-brand-soft text-brand" : "border-border text-muted"
                  }`}
                >
                  <s.icon className="h-4 w-4" /> {s.label}
                </button>
              );
            })}
          </div>
          <StepFooter onBack={back} onNext={next} nextLabel="Continue" />
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-lg font-semibold">Your default pipeline is ready</h2>
          <p className="mt-1 text-sm text-muted">You can customize stages any time from Pipeline settings.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {defaultStages.map((s) => (
              <span key={s} className="rounded-full bg-muted-surface px-3 py-1 text-xs font-medium">{s}</span>
            ))}
          </div>
          <StepFooter onBack={back} onNext={next} nextLabel="Continue" />
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-lg font-semibold">Connect your channels</h2>
          <p className="mt-1 text-sm text-muted">
            Connect WhatsApp, Facebook, Instagram or Gmail now, or skip and do it later from Settings →
            Integrations. Until real credentials are connected, these run in a safe mock mode.
          </p>
          <StepFooter onBack={back} onNext={finish} nextLabel={pending ? "Finishing…" : "Go to Dashboard"} />
        </div>
      )}
    </Card>
  );
}

function StepFooter({
  onBack,
  onNext,
  onSkip,
  nextLabel,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel: string;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <div>{onBack && <Button variant="ghost" onClick={onBack}>Back</Button>}</div>
      <div className="flex items-center gap-3">
        {onSkip && <button onClick={onSkip} className="text-sm text-muted hover:text-foreground">Skip</button>}
        <Button onClick={onNext}>{nextLabel}</Button>
      </div>
    </div>
  );
}
