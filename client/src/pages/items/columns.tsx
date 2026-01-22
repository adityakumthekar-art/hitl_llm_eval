import { type ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { ReviewItem } from "@/types/items"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<ReviewItem>[] = [
  {
    accessorKey: "review_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/items/${row.original.review_id}`}
        className="font-medium text-neutral-600 hover:underline"
      >
        {row.original.review_id}
      </Link>
    ),
  },
  {
    accessorKey: "question",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Question" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[400px] truncate" title={row.original.question}>
        {row.original.question}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge
          variant={status === "reviewed" ? "default" : "secondary"}
        >
          {status}
        </Badge>
      )
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "review_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.review_type_label}</span>
    ),
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subject" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.subject}</Badge>
    ),
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "model",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Model" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.model}</span>
    ),
  },
  {
    accessorKey: "deepeval_scores.overall_score",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Score" />
    ),
    cell: ({ row }) => {
      const score = row.original.deepeval_scores.overall_score
      const formattedScore = (score * 100).toFixed(0)
      return (
        <span
          className={
            score >= 0.7
              ? "text-green-600"
              : score >= 0.5
                ? "text-yellow-600"
                : "text-red-600"
          }
        >
          {formattedScore}%
        </span>
      )
    },
  },
]

