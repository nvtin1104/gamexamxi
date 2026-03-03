"use client"

import * as React from "react"
import {
  Bell,
  Search,
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  ShoppingCart,
  Inbox,
  HelpCircle,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/dashboard/ThemeToggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

// --- Types ---
interface HeaderProps {
  title: string
}

interface Notification {
  id: string
  avatar: string
  name: string
  message: string
  time: string
  read: boolean
}

// --- Mock notifications ---
const initialNotifications: Notification[] = [
  {
    id: "1",
    avatar: "NV",
    name: "Nguyen Van A",
    message: "da dat don hang moi #1234",
    time: "2 phut truoc",
    read: false,
  },
  {
    id: "2",
    avatar: "TH",
    name: "Tran Hoang",
    message: "da gui yeu cau ho tro ve san pham",
    time: "15 phut truoc",
    read: false,
  },
  {
    id: "3",
    avatar: "SYS",
    name: "System",
    message: "Ban cap nhat he thong hoan tat thanh cong",
    time: "1 gio truoc",
    read: false,
  },
  {
    id: "4",
    avatar: "LP",
    name: "Le Phuong",
    message: "da de lai danh gia 5 sao cho san pham",
    time: "3 gio truoc",
    read: true,
  },
  {
    id: "5",
    avatar: "SYS",
    name: "System",
    message: "Bao cao doanh thu thang da san sang",
    time: "5 gio truoc",
    read: true,
  },
]

// --- Search command items ---
const searchPages = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Users", icon: Users, href: "/users" },
  { label: "Orders", icon: ShoppingCart, href: "/orders" },
  { label: "Inbox", icon: Inbox, href: "/inbox" },
]

const searchSettings = [
  { label: "General Settings", icon: Settings, href: "/settings" },
  { label: "Support", icon: HelpCircle, href: "/support" },
]

// --- Breadcrumb builder ---
function buildBreadcrumbs(title: string) {
  if (typeof window === "undefined") return [{ label: title, href: undefined }]
  const path = window.location.pathname
  if (path === "/" || path === "") return [{ label: "Dashboard", href: undefined }]

  const segments = path.split("/").filter(Boolean)
  const crumbs: { label: string; href: string | undefined }[] = []

  let accumulated = ""
  for (let i = 0; i < segments.length; i++) {
    accumulated += `/${segments[i]}`
    const label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1).replace(/-/g, " ")
    crumbs.push({
      label,
      href: i === segments.length - 1 ? undefined : accumulated,
    })
  }

  return crumbs
}

// --- Components ---

function SearchCommand() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = (href: string) => {
    setOpen(false)
    window.location.href = href
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative h-8 w-full justify-start rounded-md bg-muted/40 px-3 text-sm font-normal text-muted-foreground shadow-none hover:bg-muted/60 sm:w-56 md:w-64"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type to search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {searchPages.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            {searchSettings.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                <CommandShortcut>
                  {item.label === "General Settings" ? "Ctrl+," : ""}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

function NotificationsPopover() {
  const [notifications, setNotifications] = React.useState(initialNotifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[320px]">
          <div className="flex flex-col">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  !notification.read && "bg-muted/30"
                )}
              >
                <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-semibold",
                      notification.avatar === "SYS"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {notification.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm leading-tight">
                    <span className="font-medium">{notification.name}</span>{" "}
                    <span className="text-muted-foreground">
                      {notification.message}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.time}
                  </p>
                </div>
                {!notification.read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
            size="sm"
            asChild
          >
            <a href="/notifications">View all notifications</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// --- Main Header ---

export function Header({ title }: HeaderProps) {
  const breadcrumbs = buildBreadcrumbs(title)

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-14">
      {/* Left: Sidebar trigger + Breadcrumbs */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: Search + Theme + Notifications */}
      <div className="ml-auto flex items-center gap-1.5">
        <div className="hidden sm:flex">
          <SearchCommand />
        </div>
        {/* Mobile search trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:hidden"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
            )
          }}
        >
          <Search className="h-4 w-4" />
        </Button>

        <ThemeToggle />

        <NotificationsPopover />
      </div>
    </header>
  )
}
