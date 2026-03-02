"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark")

  React.useEffect(() => {
    const stored = localStorage.getItem("theme")
    const initial = stored === "light" ? "light" : "dark"
    setTheme(initial)
  }, [])

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = theme === "dark" ? "light" : "dark"

    // Skip animation if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(next)
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
      return
    }

    // Create ripple overlay from button position (top-right corner)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    // Calculate max radius to cover entire viewport from top-right to bottom-left
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const overlay = document.createElement("div")
    overlay.className = "theme-ripple"
    overlay.style.setProperty("--ripple-x", `${x}px`)
    overlay.style.setProperty("--ripple-y", `${y}px`)
    overlay.style.setProperty("--ripple-radius", `${maxRadius}px`)
    overlay.style.setProperty(
      "--ripple-color",
      next === "dark" ? "hsl(240 10% 3.9%)" : "hsl(0 0% 100%)"
    )
    document.body.appendChild(overlay)

    // Trigger expansion
    requestAnimationFrame(() => {
      overlay.classList.add("theme-ripple--active")
    })

    // Apply theme once ripple covers the screen, then fade out overlay
    setTimeout(() => {
      setTheme(next)
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")

      // Fade out the overlay so the real UI shows through
      requestAnimationFrame(() => {
        overlay.classList.add("theme-ripple--fade")
      })
    }, 350)

    // Remove overlay after fade completes
    setTimeout(() => overlay.remove(), 850)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="h-8 w-8"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
