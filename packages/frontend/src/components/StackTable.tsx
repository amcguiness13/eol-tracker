import type { StackItem } from "@eol-tracker/shared";

interface StackTableProps {
  items: StackItem[];
  onRemove: (id: string) => void;
}

export function StackTable({ items, onRemove }: StackTableProps) {
  if (items.length === 0) {
    return <p>Your stack is empty. Select a product above, or import a CSV.</p>;
  }

  return (
    <table className="stack-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Cycle</th>
          <th>Environment</th>
          <th>Owner</th>
          <th>Notes</th>
          <th>Source</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.product}</td>
            <td>{item.cycle}</td>
            <td>{item.environment}</td>
            <td>{item.owner ?? "—"}</td>
            <td>{item.notes ?? "—"}</td>
            <td>{item.source}</td>
            <td>
              <button type="button" onClick={() => onRemove(item.id)}>
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
