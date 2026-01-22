import { useItemsQuery } from "./items/queries"
import { columns } from "./items/columns"
import { DataTable } from "@/components/ui/data-table"
import ListParams from "./items/listParams"
import { useItemsParams } from "./items/useItemsParams"

export default function Items() {
  const { committedParams } = useItemsParams()
  const { data, isLoading, isError, error } = useItemsQuery(committedParams)

  return (
    <div className="h-dvh grid grid-rows-[auto_1fr] grid-cols-1 overflow-hidden">
      <div className="border-b sticky top-0 bg-background flex items-center justify-between border-border px-6 h-16">
        <span className="text-xl font-semibold">Items</span>
      </div>
      <div className="grid grid-cols-4 min-h-0 overflow-hidden">
        <div className="col-span-1 border-r border-border bg-neutral-50 overflow-auto">
          <ListParams isLoading={isLoading} />
        </div>
        <div className="col-span-3 p-6 min-h-0 overflow-hidden">
          {isLoading && <p>Loading...</p>}
          {isError && <p>Error: {error.message}</p>}
          {data && (
            <DataTable
              columns={columns}
              data={data.items}
              searchKey="question"
              searchPlaceholder="Search items"
            />
          )}
        </div>
      </div>
    </div>
  )
}
