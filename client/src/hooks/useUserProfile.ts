import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "user_profile"

export interface UserProfile {
    name: string
    email: string
}

function getStoredProfile(): UserProfile | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.name && parsed.email) {
                return parsed as UserProfile
            }
        }
    } catch {
        // Invalid JSON, return null
    }
    return null
}

function setStoredProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function useUserProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(() => getStoredProfile())

    const saveProfile = useCallback((newProfile: UserProfile) => {
        setStoredProfile(newProfile)
        setProfile(newProfile)
    }, [])

    const clearProfile = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        setProfile(null)
    }, [])

    // Sync with localStorage changes from other tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                setProfile(getStoredProfile())
            }
        }
        window.addEventListener("storage", handleStorageChange)
        return () => window.removeEventListener("storage", handleStorageChange)
    }, [])

    return {
        profile,
        hasProfile: profile !== null,
        saveProfile,
        clearProfile,
    }
}

