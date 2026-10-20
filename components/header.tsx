"use client"

import { useState, memo } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LogOut,
  Building2,
  Store,
  UserRound,
  KeyRound,
  Settings,
  Smartphone,
  ShieldCheck,
  ChevronDown,
} from "lucide-react"
import { isMobileAppPromoHidden } from "@/lib/dha-cert-scope"
import { HeaderGlobalSearch } from "@/components/header-global-search"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { CriticalAlertsHeaderBadge } from "@/components/critical-alerts-header-badge"
import { PharmacyNotificationsHeaderBadge } from "@/components/pharmacy-notifications-header-badge"
import { PublicHealthNotificationsHeaderBadge } from "@/components/public-health-notifications-header-badge"
import { ChangePasswordModal } from "@/components/change-password-modal"
import { TwoFactorSetupModal } from "@/components/two-factor-setup-modal"
import { useRouter, usePathname } from "next/navigation"
import { isModuleHubPath } from "@/lib/module-navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { useChemistScope } from "@/lib/hooks/use-chemist-scope"
import { getHeaderUserDisplayName, shortenFacilityLabel } from "@/lib/user-greeting"
import { cn } from "@/lib/utils"

export const Header = memo(function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const hubMode = isModuleHubPath(pathname)
  const { user, currentBranch, accessibleBranches, setCurrentBranch } = useAuth()
  const { displayName: chemistDisplayName, isChemistUser } = useChemistScope()
  const canSwitchBranch = accessibleBranches.length > 1
  const userDisplayName = getHeaderUserDisplayName(user)
  const userRoleLabel = user?.role ? String(user.role).replace(/_/g, " ") : ""
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [twoFactorOpen, setTwoFactorOpen] = useState(false)

  const facilityLabel = isChemistUser
    ? chemistDisplayName
    : currentBranch?.branchName
      ? shortenFacilityLabel(currentBranch.branchName)
      : null
  const facilityTitle = isChemistUser
    ? chemistDisplayName
    : currentBranch?.branchName || undefined

  return (
    <header className="app-chrome-header sticky top-0 z-[60] flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        {!hubMode ? <SidebarTrigger /> : null}
        <BreadcrumbsEnhanced />
        {!hubMode ? <HeaderGlobalSearch /> : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        {facilityLabel && !isChemistUser ? (
          <div
            className={cn(
              "hidden max-w-[7rem] items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs md:flex lg:max-w-[9rem] xl:max-w-[11rem] 2xl:max-w-[14rem]",
            )}
            title={facilityTitle}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {canSwitchBranch ? (
              <select
                className="min-w-0 flex-1 truncate bg-transparent text-xs font-medium outline-none xl:text-sm"
                value={String(currentBranch!.branchId)}
                onChange={(event) => setCurrentBranch(event.target.value)}
                aria-label="Current branch"
              >
                {accessibleBranches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.branchName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="truncate font-medium">{facilityLabel}</span>
            )}
          </div>
        ) : null}

        {isChemistUser && chemistDisplayName ? (
          <div
            className="hidden max-w-[9rem] items-center gap-1.5 truncate rounded-md border bg-muted/40 px-2 py-1.5 text-xs font-medium md:flex"
            title={chemistDisplayName}
          >
            <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{shortenFacilityLabel(chemistDisplayName, 28)}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-0.5 sm:gap-1">
          <CriticalAlertsHeaderBadge />
          <PublicHealthNotificationsHeaderBadge />
          <PharmacyNotificationsHeaderBadge />
        </div>

        {!isMobileAppPromoHidden() ? (
          <Button variant="ghost" size="icon" className="hidden h-8 w-8 sm:flex" asChild title="Mobile app">
            <Link href="/field-app" aria-label="Download mobile app">
              <Smartphone className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
        <ModeToggle />

        {userDisplayName ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 max-w-[8rem] items-center gap-1 rounded-md border bg-muted/40 px-2 text-left text-xs hover:bg-muted/70 sm:h-9 sm:max-w-[10rem] sm:px-2.5 lg:max-w-[11rem]"
                title={
                  facilityTitle
                    ? `${userDisplayName}${userRoleLabel ? ` · ${userRoleLabel}` : ""} · ${facilityTitle}`
                    : userRoleLabel
                      ? `${userDisplayName} · ${userRoleLabel}`
                      : userDisplayName
                }
              >
                <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate font-medium">{userDisplayName}</span>
                <ChevronDown className="hidden h-3 w-3 shrink-0 opacity-60 sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userDisplayName}</p>
                  {userRoleLabel ? (
                    <p className="text-xs capitalize text-muted-foreground">{userRoleLabel}</p>
                  ) : null}
                  {user?.username ? (
                    <p className="text-xs text-muted-foreground">
                      Unique user ID: <span className="font-mono">@{user.username}</span>
                      {user?.id != null ? ` · user #${user.id}` : ""}
                    </p>
                  ) : null}
                </div>
              </DropdownMenuLabel>
              {currentBranch && !isChemistUser ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    <span className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="leading-snug">{currentBranch.branchName}</span>
                    </span>
                  </DropdownMenuLabel>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Change password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTwoFactorOpen(true)}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {user?.totpEnabled ? "Two-factor (enabled)" : "Set up two-factor"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {!isMobileAppPromoHidden() ? (
                <DropdownMenuItem onClick={() => router.push("/field-app")}>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Mobile app
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => router.push("/logout")}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <Button
          variant="outline"
          size={hubMode ? "sm" : "icon"}
          onClick={() => router.push("/logout")}
          className={
            hubMode
              ? "h-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-9"
          }
          title="Log out"
          aria-label="Log out"
        >
          {hubMode ? (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </>
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <TwoFactorSetupModal
        open={twoFactorOpen || Boolean(user?.mustSetup2fa && !user?.totpEnabled)}
        onOpenChange={setTwoFactorOpen}
        required={Boolean(user?.mustSetup2fa && !user?.totpEnabled)}
      />
    </header>
  )
})
