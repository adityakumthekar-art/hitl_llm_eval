import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserProfile } from "@/hooks/useUserProfile"

export default function ProfileDialog() {
    const { hasProfile, saveProfile } = useUserProfile()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")

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
    }

    if (hasProfile) {
        return null
    }

    return (
        <Dialog open={!hasProfile}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Welcome! Set up your profile</DialogTitle>
                        <DialogDescription>
                            Please enter your name and email to continue. This will be used to identify your reviews.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                autoFocus
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
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full sm:w-auto">
                            Save Profile
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

