import { STATUS_CFG } from "../../lib/constants.js";

/**
 * Status badge pill
 * @param {string} status - "available" | "rented" | "pending" | "confirmed" | "active" | "completed" | "cancelled"
 */
export default function Badge({ status }) {
  const c = STATUS_CFG[status] || { label: status, color: "#888" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 700,
        background: c.color + "20",
        color: c.color,
        border: `1px solid ${c.color}80`,
        whiteSpace: "nowrap",
        letterSpacing: 0.5,
      }}
    >
      {c.label}
    </span>
  );
}
