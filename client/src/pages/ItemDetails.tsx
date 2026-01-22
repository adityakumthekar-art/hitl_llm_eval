import { useParams } from "react-router-dom"

export default function ItemDetails() {
  const { id } = useParams()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Item Details</h1>
      <p>Item ID: {id}</p>
    </div>
  )
}

