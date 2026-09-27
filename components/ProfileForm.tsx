"use client";

import { useState } from "react";
import type { UserProfileRow } from "@/lib/supabase/types";

interface Props {
  initial: UserProfileRow | null;
}

// v1: structured goals/plan are edited as raw JSON text. A dedicated
// builder UI is a later polish pass, not needed to unblock the rest of
// the app.
export default function ProfileForm({ initial }: Props) {
  const [heightCm, setHeightCm] = useState(initial?.height_cm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(initial?.weight_kg?.toString() ?? "");
  const [birthYear, setBirthYear] = useState(initial?.birth_year?.toString() ?? "");
  const [maxHeartRate, setMaxHeartRate] = useState(initial?.max_heart_rate?.toString() ?? "");
  const [trainingLevel, setTrainingLevel] = useState(initial?.training_level ?? "");
  const [goalsFreeform, setGoalsFreeform] = useState(initial?.goals_freeform ?? "");
  const [goalsStructured, setGoalsStructured] = useState(
    JSON.stringify(initial?.goals_structured ?? [], null, 2),
  );
  const [planFreeform, setPlanFreeform] = useState(initial?.training_plan_freeform ?? "");
  const [planStructured, setPlanStructured] = useState(
    JSON.stringify(initial?.training_plan_structured ?? [], null, 2),
  );

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toNumberOrNull(value: string): number | null {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    let parsedGoalsStructured: unknown[];
    let parsedPlanStructured: unknown[];
    try {
      parsedGoalsStructured = JSON.parse(goalsStructured || "[]");
      parsedPlanStructured = JSON.parse(planStructured || "[]");
    } catch {
      setStatus("error");
      setErrorMessage("Strukturerte mål/plan må være gyldig JSON.");
      return;
    }

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        height_cm: toNumberOrNull(heightCm),
        weight_kg: toNumberOrNull(weightKg),
        birth_year: toNumberOrNull(birthYear),
        max_heart_rate: toNumberOrNull(maxHeartRate),
        training_level: trainingLevel || null,
        goals_freeform: goalsFreeform || null,
        goals_structured: parsedGoalsStructured,
        training_plan_freeform: planFreeform || null,
        training_plan_structured: parsedPlanStructured,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setStatus("error");
      setErrorMessage(body.error ?? "Lagring feilet.");
      return;
    }

    setStatus("saved");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Høyde (cm)
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="rounded border border-black/10 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Vekt (kg)
          <input
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="rounded border border-black/10 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fødselsår
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="rounded border border-black/10 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Maks puls
          <input
            type="number"
            value={maxHeartRate}
            onChange={(e) => setMaxHeartRate(e.target.value)}
            className="rounded border border-black/10 px-2 py-1"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Treningsnivå
        <select
          value={trainingLevel}
          onChange={(e) => setTrainingLevel(e.target.value)}
          className="rounded border border-black/10 px-2 py-1"
        >
          <option value="">Ikke satt</option>
          <option value="beginner">Nybegynner</option>
          <option value="intermediate">Middels</option>
          <option value="advanced">Avansert</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Mål (fritekst)
        <textarea
          value={goalsFreeform}
          onChange={(e) => setGoalsFreeform(e.target.value)}
          rows={3}
          className="rounded border border-black/10 px-2 py-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Mål (strukturert JSON)
        <textarea
          value={goalsStructured}
          onChange={(e) => setGoalsStructured(e.target.value)}
          rows={4}
          className="rounded border border-black/10 px-2 py-1 font-mono text-xs"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Treningsplan (fritekst)
        <textarea
          value={planFreeform}
          onChange={(e) => setPlanFreeform(e.target.value)}
          rows={3}
          className="rounded border border-black/10 px-2 py-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Treningsplan (strukturert JSON)
        <textarea
          value={planStructured}
          onChange={(e) => setPlanStructured(e.target.value)}
          rows={4}
          className="rounded border border-black/10 px-2 py-1 font-mono text-xs"
        />
      </label>

      {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
      {status === "saved" && <p className="text-sm text-green-600">Lagret.</p>}

      <button
        type="submit"
        disabled={status === "saving"}
        className="w-fit rounded bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
      >
        {status === "saving" ? "Lagrer..." : "Lagre"}
      </button>
    </form>
  );
}
