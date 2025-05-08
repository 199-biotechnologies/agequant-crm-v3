"use client"

import { usePathname, useRouter } from "next/navigation"
import { ChevronLeft, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ActionButtons } from "@/components/layout/action-buttons"

interface TopBarProps {
  onMenuClick: () => void
  showBackButton?: boolean
}

export function TopBar({ onMenuClick, showBackButton = false }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleBack = () => {
    router.back()
  }

  return (
    <header className="flex h-16 items-center justify-between border-b px-4">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        {showBackButton && (
          <Button variant="ghost" size="sm" onClick={handleBack} className="ml-2 flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}
      </div>
      <ActionButtons pathname={pathname} />
    </header>
  )
}
