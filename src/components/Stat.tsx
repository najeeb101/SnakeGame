import { motion } from "framer-motion";

export function Stat({
  label,
  value,
  highlight = false,
  pulse = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  pulse?: boolean;
}) {
  return (
    <motion.article
      className={highlight ? "stat highlight" : "stat"}
      animate={pulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.article>
  );
}
