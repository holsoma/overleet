import { Check, Circle, RotateCcw } from "lucide-react";
import { statusLabels } from "@/lib/question-schema";
import type { ProgressStatus, QuestionContent } from "@/lib/contracts";

export function Difficulty({ value }: { value: QuestionContent["difficulty"] }) {
  return <span className={`difficulty difficulty-${value}`}><span aria-hidden="true" className="difficulty-dot" />{value[0].toUpperCase() + value.slice(1)}</span>;
}
export function Status({ value }: { value: ProgressStatus }) {
  const Icon = value === "completed" ? Check : value === "review_later" ? RotateCcw : Circle;
  return <span className={`question-status status-${value}`}><Icon size={14} aria-hidden="true" />{statusLabels[value]}</span>;
}
