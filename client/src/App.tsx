import { Routes, Route } from "react-router-dom"
import SidebarWrapper from "@/components/SidebarWrapper"
import Dashboard from "@/pages/Dashboard"
import Items from "@/pages/Items"
import ItemDetails from "@/pages/ItemDetails"

export default function App() {
  return (
    <SidebarWrapper>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/:id" element={<ItemDetails />} />
      </Routes>
    </SidebarWrapper>
  )
}
