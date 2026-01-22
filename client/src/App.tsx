import { Routes, Route } from "react-router-dom"
import SidebarWrapper from "@/components/SidebarWrapper"
import ProfileDialog from "@/components/ProfileDialog"
import Dashboard from "@/pages/Dashboard"
import Items from "@/pages/Items"
import ItemDetails from "@/pages/ItemDetails"
import Profile from "@/pages/Profile"

export default function App() {
  return (
    <>
      <ProfileDialog />
      <SidebarWrapper>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/items" element={<Items />} />
          <Route path="/items/:id" element={<ItemDetails />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </SidebarWrapper>
    </>
  )
}
