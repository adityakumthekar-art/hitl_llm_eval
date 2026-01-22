import {
  FileStack,
  Clock,
  CheckCircle2,
  SkipForward,
  TrendingUp,
} from "lucide-react"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { useReviewSummaryQuery } from "./dashboard/queries"
import { Skeleton } from "@/components/ui/skeleton"

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border p-6 space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-11 w-11 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data: summary, isLoading, error } = useReviewSummaryQuery()

  return (
    <div>
      <div className="border-b flex items-center justify-between border-border px-6 h-16">
        <span className="text-xl font-semibold">Dashboard</span>
      </div>

      <div className="p-6">
        {isLoading && <DashboardSkeleton />}

        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
            <p className="font-medium">Failed to load summary</p>
            <p className="text-sm opacity-80">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </p>
          </div>
        )}

        {summary && (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <SummaryCard
                title="Total Items"
                value={summary.total_items}
                icon={FileStack}
                description="All review items"
                variant="default"
              />
              <SummaryCard
                title="Pending"
                value={summary.pending}
                icon={Clock}
                description="Awaiting review"
                variant="warning"
              />
              <SummaryCard
                title="Reviewed"
                value={summary.reviewed}
                icon={CheckCircle2}
                description="Completed reviews"
                variant="success"
              />
              <SummaryCard
                title="Skipped"
                value={summary.skipped}
                icon={SkipForward}
                description="Items skipped"
                variant="info"
              />
              <SummaryCard
                title="Progress"
                value={`${summary.progress_percent}%`}
                icon={TrendingUp}
                description="Overall completion"
                variant="progress"
              />
            </div>

            {/* Progress Bar */}
            <div className="rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Review Progress</span>
                <span className="text-sm text-muted-foreground">
                  {summary.reviewed + summary.skipped} of {summary.total_items} items processed
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${summary.progress_percent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
