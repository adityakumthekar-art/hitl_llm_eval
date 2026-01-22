import { useItemsQuery } from "./items/queries"

export default function Items() {
  const { data, isLoading, isError, error } = useItemsQuery({ page: 1, per_page: 10 })

  return (
    <div>
      <div className="border-b flex items-center justify-between border-border px-6 h-16">
        <span className="text-xl font-semibold">Items</span>
      </div>
      <div className="p-6">
        {isLoading && <p>Loading...</p>}
        {isError && <p>Error: {error.message}</p>}
        {data && (
          <ul className="space-y-2">
            {data.items.map((item) => (
              <li key={item.review_id} className="border border-border rounded p-3">
                <p className="font-medium">{item.question}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {item.status} | Type: {item.review_type_label}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
