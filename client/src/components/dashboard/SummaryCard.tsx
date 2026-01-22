import type { LucideIcon } from "lucide-react"

interface SummaryCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  description?: string
  variant?: "default" | "success" | "warning" | "info" | "progress"
}

const variantStyles = {
  default: {
    bg: "bg-card",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  success: {
    bg: "bg-card",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  warning: {
    bg: "bg-card",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  info: {
    bg: "bg-card",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  progress: {
    bg: "bg-card",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
}

export function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: SummaryCardProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={`${styles.bg} rounded-xl border border-border p-6 transition-all hover:shadow-md hover:border-border/80`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={`${styles.iconBg} ${styles.iconColor} p-3 rounded-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

