"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { importLeadsAction, type ImportResult } from "@/server/actions/import";
import { Upload } from "lucide-react";

const FIELDS = [
  { key: "name", label: "Name (required)" },
  { key: "mobile", label: "Mobile" },
  { key: "email", label: "Email" },
  { key: "company", label: "Company" },
  { key: "source", label: "Source" },
];

export function ImportWizard() {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setHeaders(res.meta.fields ?? []);
        setRows(res.data);
        const auto: Record<string, string> = {};
        for (const f of FIELDS) {
          const match = (res.meta.fields ?? []).find((h) => h.toLowerCase().includes(f.key));
          if (match) auto[f.key] = match;
        }
        setMapping(auto);
        setStep("map");
      },
    });
  }

  async function runImport() {
    setPending(true);
    const mapped = rows.map((r) => ({
      name: mapping.name ? r[mapping.name] : "",
      mobile: mapping.mobile ? r[mapping.mobile] : undefined,
      email: mapping.email ? r[mapping.email] : undefined,
      company: mapping.company ? r[mapping.company] : undefined,
      source: mapping.source ? r[mapping.source] : undefined,
    }));
    const res = await importLeadsAction(mapped);
    setResult(res);
    setStep("done");
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="max-w-2xl p-6">
      {step === "upload" && (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center hover:border-brand">
            <Upload className="h-8 w-8 text-muted" />
            <span className="mt-3 text-sm font-medium">Click to upload a CSV file</span>
            <span className="mt-1 text-xs text-muted">Headers in the first row</span>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>
      )}

      {step === "map" && (
        <div>
          <h2 className="font-semibold">Map columns</h2>
          <p className="mt-1 text-sm text-muted">{rows.length} rows found. Match your CSV columns to lead fields.</p>
          <div className="mt-4 space-y-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4">
                <span className="text-sm">{f.label}</span>
                <Select
                  className="w-56"
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                >
                  <option value="">Not mapped</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep("upload")}>Back</Button>
            <Button disabled={!mapping.name} onClick={() => setStep("preview")}>Preview</Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div>
          <h2 className="font-semibold">Preview</h2>
          <p className="mt-1 text-sm text-muted">Showing first 5 of {rows.length} rows.</p>
          <div className="mt-4 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border bg-muted-surface"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Mobile</th><th className="p-2 text-left">Email</th></tr></thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="p-2">{mapping.name ? r[mapping.name] : "—"}</td>
                    <td className="p-2">{mapping.mobile ? r[mapping.mobile] : "—"}</td>
                    <td className="p-2">{mapping.email ? r[mapping.email] : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep("map")}>Back</Button>
            <Button disabled={pending} onClick={runImport}>{pending ? "Importing…" : `Import ${rows.length} rows`}</Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div>
          <h2 className="font-semibold">Import complete</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-success-soft p-4"><p className="text-2xl font-bold text-success">{result.imported}</p><p className="text-xs text-muted">Imported</p></div>
            <div className="rounded-md bg-warning-soft p-4"><p className="text-2xl font-bold text-warning">{result.duplicates}</p><p className="text-xs text-muted">Duplicates skipped</p></div>
            <div className="rounded-md bg-danger-soft p-4"><p className="text-2xl font-bold text-danger">{result.skipped}</p><p className="text-xs text-muted">Errors</p></div>
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-4 max-h-32 space-y-1 overflow-y-auto text-xs text-muted">
              {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
            </ul>
          )}
          <Button className="mt-6" onClick={() => router.push("/leads")}>Go to Leads</Button>
        </div>
      )}
    </Card>
  );
}
