import { useEffect, useState } from "react";
import type { EolProductDetailResult, StackItemInput } from "@eol-tracker/shared";
import { api } from "../api/client";

interface CycleSelectorProps {
  productSlug: string;
  onAdded: () => void;
}

export function CycleSelector({ productSlug, onAdded }: CycleSelectorProps) {
  const [detail, setDetail] = useState<EolProductDetailResult | null>(null);
  const [cycle, setCycle] = useState("");
  const [environment, setEnvironment] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDetail(null);
    setCycle("");
    setError(null);
    api
      .getProduct(productSlug)
      .then((r) => {
        setDetail(r.result);
        if (r.result.releases.length > 0) setCycle(r.result.releases[0].name);
      })
      .catch((err) => setError(err.message));
  }, [productSlug]);

  // Allow a user to type a custom cycle/version (useful when the desired
  // We read all releases from endoflife.date and present them in the
  // select control — no freeform entry required.

  async function handleAdd() {
    if (!cycle) return;
    setSubmitting(true);
    setError(null);
    try {
      const input: StackItemInput = {
        product: productSlug,
        cycle,
        environment: environment || undefined,
        owner: owner || undefined,
        notes: notes || undefined,
      };
      await api.addStackItem(input);
      setOwner("");
      setNotes("");
      setEnvironment("");
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !detail) {
    return <p className="error-text">{error}</p>;
  }

  if (!detail) {
    return <p>Loading cycles...</p>;
  }

  return (
    <div className="cycle-selector">
      <h3>{detail.label}</h3>

      <label>
        Release cycle / version
        <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
          {detail.releases.map((r) => (
            <option key={r.name} value={r.name}>
              {r.label} {r.isLts ? "(LTS)" : ""}
            </option>
          ))}
        </select>
      </label>

      {/* All available releases are provided by the API and selectable above. */}

      <label>
        Environment
        <input
          type="text"
          placeholder="prod / staging / dev"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
        />
      </label>

      <label>
        Owner
        <input type="text" placeholder="team or person" value={owner} onChange={(e) => setOwner(e.target.value)} />
      </label>

      <label>
        Notes
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && <p className="error-text">{error}</p>}

      <button type="button" onClick={handleAdd} disabled={submitting || !cycle}>
        {submitting ? "Adding..." : "Add to stack"}
      </button>
    </div>
  );
}
