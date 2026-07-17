import { useEffect, useState } from "react";
import { api } from "../api/client";

export function ThresholdSettings() {
  const [days, setDays] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .getGlobalThresholds()
      .then((r) => setDays(r.result.map((t) => t.days).sort((a, b) => b - a)))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function save(nextDays: number[]) {
    setSaving(true);
    setError(null);
    try {
      const result = await api.setGlobalThresholds(nextDays);
      setDays(result.result.map((t) => t.days).sort((a, b) => b - a));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleAdd() {
    const value = Number(input);
    if (!Number.isInteger(value) || value < 0 || days.includes(value)) return;
    save([...days, value]);
    setInput("");
  }

  function handleRemove(value: number) {
    if (days.length <= 1) return; // keep at least one threshold configured
    save(days.filter((d) => d !== value));
  }

  return (
    <div className="threshold-settings">
      <h3>Global notification thresholds</h3>
      <p>Notify me this many days before a stack item's EOL date, unless a stack item has its own override.</p>
      {error && <p className="error-text">{error}</p>}
      <ul className="threshold-list">
        {days.map((d) => (
          <li key={d}>
            {d} days
            <button type="button" onClick={() => handleRemove(d)} disabled={saving || days.length <= 1}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="threshold-add">
        <input
          type="number"
          min={0}
          placeholder="e.g. 60"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="button" onClick={handleAdd} disabled={saving || !input}>
          Add threshold
        </button>
      </div>
    </div>
  );
}
