import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserProfile } from "@/hooks/useUserProfile"
import { toast } from "sonner"
import { ArrowLeft, Save } from "lucide-react"

export default function Profile() {
    const navigate = useNavigate()
    const { profile, saveProfile } = useUserProfile()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        if (profile) {
            setName(profile.name)
            setEmail(profile.email)
        }
    }, [profile])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!name.trim()) {
            setError("Name is required")
            return
        }
        if (!email.trim()) {
            setError("Email is required")
            return
        }
        if (!email.includes("@")) {
            setError("Please enter a valid email")
            return
        }

        saveProfile({ name: name.trim(), email: email.trim() })
        toast.success("Profile updated successfully!")
    }

    return (
        <div className="h-dvh grid grid-rows-[auto_1fr] grid-cols-1 overflow-hidden">
            {/* Header */}
            <div className="border-b sticky top-0 bg-background flex items-center gap-4 border-border px-6 h-16">
                <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="size-4" />
                </Button>
                <span className="text-xl font-semibold">Profile</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-md mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <Button type="submit" className="w-full">
                            <Save className="size-4 mr-2" />
                            Save Profile
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}

