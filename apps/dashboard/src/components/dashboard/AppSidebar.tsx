"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  BarChart3,
  ShoppingCart,
  Inbox,
  Bell,
  HelpCircle,
  type LucideIcon,
  ChevronsUpDown,
  Sparkles,
  BadgeCheck,
  CreditCard,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api, clearTokens } from "@/lib/api"
import { clearAuthState, $currentUser } from "@/stores/auth"
import { useStore } from "@nanostores/react"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface NavSubItem {
  label: string
  href: string
}

interface NavItem {
  label: string
  href?: string
  icon: LucideIcon
  badge?: string
  subItems?: NavSubItem[]
}

// --- Navigation Data ---
const navMain: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "Analytics",
    icon: BarChart3,
    subItems: [
      { label: "Overview", href: "/analytics" },
      { label: "Reports", href: "/analytics/reports" },
    ],
  },
  { label: "Users", href: "/users", icon: Users, badge: "12" },
  {
    label: "Orders",
    icon: ShoppingCart,
    subItems: [
      { label: "All Orders", href: "/orders" },
      { label: "Pending", href: "/orders/pending" },
    ],
  },
  { label: "Inbox", href: "/inbox", icon: Inbox, badge: "3" },
]

const navSecondary: NavItem[] = [
  { label: "Support", href: "/support", icon: HelpCircle },
  { label: "Settings", href: "/settings", icon: Settings },
]

// --- Sub-components ---

function NavMain({ items }: { items: NavItem[] }) {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : ""
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        Main Menu
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasActiveSub = item.subItems?.some((s) => currentPath.startsWith(s.href))

          if (item.subItems) {
            // Collapsed mode: hover popover with sub-menu list
            if (isCollapsed) {
              return (
                <NavPopoverItem
                  key={item.label}
                  item={item}
                  currentPath={currentPath}
                />
              )
            }

            // Expanded mode: collapsible inline sub-menu
            return (
              <Collapsible key={item.label} asChild defaultOpen={hasActiveSub} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.label}
                      className="transition-all hover:bg-sidebar-accent"
                    >
                      <item.icon className="size-4 opacity-70 group-hover:opacity-100" />
                      <span className="font-medium">{item.label}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 opacity-50" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="border-l-2 border-sidebar-border/50 ml-4 pl-2 transition-all">
                      {item.subItems.map((sub) => (
                        <SidebarMenuSubItem key={sub.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={currentPath === sub.href}
                            className="relative"
                          >
                            <a href={sub.href}>
                              {sub.label}
                              {currentPath === sub.href && (
                                <span className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                tooltip={item.label}
                isActive={currentPath === item.href}
                className="transition-all hover:bg-sidebar-accent data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
              >
                <a href={item.href}>
                  <item.icon className="size-4 opacity-70 group-hover:opacity-100" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5",
                      "bg-primary/10 text-primary text-[10px] font-semibold tracking-tighter",
                      "border border-primary/20 shadow-[0_0_8px_rgba(var(--primary),0.1)]",
                      "transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// Hover popover for items with sub-menus in collapsed sidebar mode
function NavPopoverItem({
  item,
  currentPath,
}: {
  item: NavItem
  currentPath: string
}) {
  const [open, setOpen] = React.useState(false)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  React.useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const isGroupActive = item.subItems?.some((s) => currentPath.startsWith(s.href))

  return (
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton
            isActive={!!isGroupActive}
            className={cn(
              "transition-all hover:bg-sidebar-accent",
              isGroupActive && "bg-primary/10 text-primary"
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <item.icon className="size-4 opacity-70" />
            <span className="font-medium">{item.label}</span>
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-48 p-1.5"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Group header */}
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <item.icon className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </span>
          </div>
          <div className="h-px bg-border mb-1" />
          {/* Sub-items */}
          {item.subItems?.map((sub) => {
            const isActive = currentPath === sub.href || currentPath.startsWith(sub.href + "/")
            return (
              <a
                key={sub.href}
                href={sub.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground"
                )}
              >
                {isActive && (
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                )}
                {!isActive && (
                  <span className="size-1.5 rounded-full bg-transparent shrink-0" />
                )}
                {sub.label}
              </a>
            )
          })}
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  )
}

function NavUser() {
  const { isMobile } = useSidebar()
  const currentUser = useStore($currentUser)

  const handleLogout = async () => {
    try {
      await api.auth.logout()
    } catch {
      // ignore — still clear local state
    }
    clearTokens()
    clearAuthState()
    window.location.href = "/login"
  }

  const user = {
    name: currentUser?.name ?? "Admin",
    email: currentUser?.email ?? "admin@gamexamxi.com",
    avatar: "/avatars/user.jpg", // Ví dụ path
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-colors border border-transparent hover:border-sidebar-border"
            >
              <Avatar className="h-8 w-8 rounded-full shadow-sm">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-full bg-primary/10 text-primary font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                <span className="truncate font-bold">{user.name}</span>
                <span className="truncate text-[11px] text-muted-foreground opacity-80">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-40" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-3 text-left">
                <Avatar className="h-10 w-10 rounded-full">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="truncate text-sm font-bold">{user.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer">
                <Sparkles className="mr-2 size-4 text-orange-500" />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer">
                <BadgeCheck className="mr-2 size-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <CreditCard className="mr-2 size-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Bell className="mr-2 size-4" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// --- Main Sidebar Component ---

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="" {...props}>
      <SidebarHeader className="">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Gamexamxi">
              <a href="/" className="flex items-center gap-3">
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20">
                  G
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-black tracking-tight text-base">GAMEXAMXI</span>
                  <span className="truncate text-[10px] font-medium text-muted-foreground tracking-widest uppercase">
                    Admin Portal
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="mx-4 opacity-50" />

      <SidebarContent className="gap-0 py-2">
        <NavMain items={navMain} />

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            System
          </SidebarGroupLabel>
          <SidebarMenu>
            {navSecondary.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild size="sm" tooltip={item.label}>
                  <a href={item.href}>
                    <item.icon className="size-4 opacity-70" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="mx-4 opacity-50" />

      <SidebarFooter className="">
        <NavUser />
      </SidebarFooter>

    </Sidebar>
  )
}