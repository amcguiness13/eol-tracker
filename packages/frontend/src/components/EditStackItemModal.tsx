import { useEffect, useState } from "react";
import type { EolProductDetailResult, StackItemWithStatus } from "@eol-tracker/shared";
import { api } from "../api/client";

interface EditStackItemModalProps {
  item: StackItemWithStatus;
  onClose: () => void;
  onSaved: () => void;
}

export function EditStackItemModal({ item, onClose, onSaved }: EditStackItemModalProps) {
  const [detail, setDetail] = useState<EolProductDetailResult | null>(null);
  const [cycle, setCycle] = useState(item.cycle);
  const [environment, setEnvironment] = useState(item.environment);
  const [owner, setOwner] = useState(item.owner ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getProduct(item.product)
      .then((r) => setDetail(r.result))
      .catch((err) => setError(err.message));
  }, [item.product]);

  async function handleSave() {
    if (!cycle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.updateStackItem(item.id, {
        cycle,
        environment: environment.trim() || undefined,
        owner: owner.trim() || null,
        notes: notes.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Edit {item.label}</h3>

        <label>
          Release cycle / version
          {detail ? (
            <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
              {!detail.releases.some((r) => r.name === cycle) && <option value={cycle}>{cycle}</option>}
              {detail.releases.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.label}
                </option>
              ))}
            </select>
          ) : (
            <input type="text" value={cycle} onChange={(e) => setCycle(e.target.value)} />
          )}
        </label>

        <label>
          Environment
          <input type="text" placeholder="prod / staging / dev" value={environment} onChange={(e) => setEnvironment(e.target.value)} />
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

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={submitting} className="button-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={submitting || !cycle.trim()}>
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
