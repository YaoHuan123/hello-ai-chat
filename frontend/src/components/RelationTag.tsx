import { relationLabel, relationTagClass, type RelationType } from "../constants/relationTypes";

type Props = {
  type: RelationType | null | undefined;
  className?: string;
};

export function RelationTag({ type, className = "" }: Props) {
  const label = relationLabel(type);
  if (!label) {
    return (
      <span className={`${relationTagClass(null)} ${className}`.trim()} aria-label="未设置">
        未设置
      </span>
    );
  }
  return (
    <span className={`${relationTagClass(type)} ${className}`.trim()} aria-label={`关系：${label}`}>
      {label}
    </span>
  );
}
