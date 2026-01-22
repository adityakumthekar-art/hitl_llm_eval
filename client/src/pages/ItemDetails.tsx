import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

export default function ItemDetails() {

  return (
    <div className="h-dvh grid grid-rows-[auto_1fr] grid-cols-1 overflow-hidden">
      <div className="border-b sticky top-0 bg-background flex items-center gap-8 border-border px-6 h-16">
        <Button variant="ghost" asChild>
          <Link to="/items">
            <ArrowLeft className="size-4" />
            Back to listing
          </Link>
        </Button>
      </div>
    </div>
  )
}

