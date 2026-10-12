/** Persistent accent styling for top-level navigation categories (Clinical, Finance, etc.) */

export type NavCategoryId =
  | "overview"
  | "patient-care"
  | "clinical-services"
  | "financial"
  | "procurement"
  | "administrative"
  | string

type CategoryChrome = {
  activeButton: string
  inactiveButton: string
  barAccent: string
}

/** Module hub landing cards — gradients and accents per top-level category */
export type ModuleHubCardTheme = {
  /** Top banner on the card */
  banner: string
  iconWrap: string
  iconColor: string
  borderHover: string
  chip: string
  glow: string
}

const DEFAULT_CHROME: CategoryChrome = {
  activeButton:
    "!bg-primary !text-primary-foreground hover:!bg-primary/90 shadow-sm [&_svg]:!text-primary-foreground",
  inactiveButton: "text-foreground/90 hover:bg-accent hover:text-accent-foreground",
  barAccent: "border-primary/60",
}

export const NAV_CATEGORY_CHROME: Record<string, CategoryChrome> = {
  overview: {
    activeButton:
      "!bg-sky-600 !text-white hover:!bg-sky-700 shadow-sm [&_svg]:!text-white",
    inactiveButton: "text-sky-950/90 hover:bg-sky-100 hover:text-sky-950 dark:text-sky-100",
    barAccent: "border-sky-500",
  },
  "patient-care": {
    activeButton:
      "!bg-emerald-600 !text-white hover:!bg-emerald-700 shadow-sm [&_svg]:!text-white",
    inactiveButton: "text-emerald-950/90 hover:bg-emerald-100 hover:text-emerald-950",
    barAccent: "border-emerald-500",
  },
  "clinical-services": {
    activeButton:
      "!bg-violet-600 !text-white hover:!bg-violet-700 shadow-sm [&_svg]:!text-white",
    inactiveButton: "text-violet-950/90 hover:bg-violet-100 hover:text-violet-950",
    barAccent: "border-violet-500",
  },
  financial: {
    activeButton:
      "!bg-amber-600 !text-white hover:!bg-amber-700 shadow-sm [&_svg]:!text-white",
    inactiveButton: "text-amber-950/90 hover:bg-amber-100 hover:text-amber-950",
    barAccent: "border-amber-500",
  },
  procurement: {
    activeButton:
      "!bg-orange-600 !text-white hover:!bg-orange-700 shadow-sm [&_svg]:!text-white",
    inactiveButton: "text-orange-950/90 hover:bg-orange-100 hover:text-orange-950",
    barAccent: "border-orange-500",
  },
  administrative: {
    activeButton:
      "!bg-slate-700 !text-white hover:!bg-slate-800 shadow-sm [&_svg]:!text-white",
    inactiveButton: "text-slate-900/90 hover:bg-slate-200 hover:text-slate-950",
    barAccent: "border-slate-500",
  },
}

export function getNavCategoryChrome(categoryId: NavCategoryId): CategoryChrome {
  return NAV_CATEGORY_CHROME[categoryId] ?? DEFAULT_CHROME
}

const DEFAULT_HUB_CARD: ModuleHubCardTheme = {
  banner: "from-primary/15 via-primary/5 to-transparent",
  iconWrap: "bg-primary/10 ring-primary/25",
  iconColor: "text-primary",
  borderHover: "group-hover:border-primary/50",
  chip: "bg-primary/10 text-primary",
  glow: "group-hover:shadow-primary/10",
}

export const MODULE_HUB_CARD_THEME: Record<string, ModuleHubCardTheme> = {
  overview: {
    banner: "from-sky-400/25 via-sky-500/10 to-transparent dark:from-sky-500/20 dark:via-sky-600/10",
    iconWrap: "bg-sky-500/15 ring-sky-500/30",
    iconColor: "text-sky-700 dark:text-sky-300",
    borderHover: "group-hover:border-sky-400/60",
    chip: "bg-sky-500/10 text-sky-800 dark:text-sky-200",
    glow: "group-hover:shadow-sky-500/15",
  },
  "patient-care": {
    banner: "from-emerald-400/25 via-emerald-500/10 to-transparent dark:from-emerald-500/20",
    iconWrap: "bg-emerald-500/15 ring-emerald-500/30",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    borderHover: "group-hover:border-emerald-400/60",
    chip: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    glow: "group-hover:shadow-emerald-500/15",
  },
  "clinical-services": {
    banner: "from-violet-400/25 via-violet-500/10 to-transparent dark:from-violet-500/20",
    iconWrap: "bg-violet-500/15 ring-violet-500/30",
    iconColor: "text-violet-700 dark:text-violet-300",
    borderHover: "group-hover:border-violet-400/60",
    chip: "bg-violet-500/10 text-violet-800 dark:text-violet-200",
    glow: "group-hover:shadow-violet-500/15",
  },
  financial: {
    banner: "from-amber-400/30 via-amber-500/10 to-transparent dark:from-amber-500/20",
    iconWrap: "bg-amber-500/15 ring-amber-500/30",
    iconColor: "text-amber-800 dark:text-amber-300",
    borderHover: "group-hover:border-amber-400/60",
    chip: "bg-amber-500/12 text-amber-900 dark:text-amber-200",
    glow: "group-hover:shadow-amber-500/15",
  },
  procurement: {
    banner: "from-orange-400/25 via-orange-500/10 to-transparent dark:from-orange-500/20",
    iconWrap: "bg-orange-500/15 ring-orange-500/30",
    iconColor: "text-orange-700 dark:text-orange-300",
    borderHover: "group-hover:border-orange-400/60",
    chip: "bg-orange-500/10 text-orange-800 dark:text-orange-200",
    glow: "group-hover:shadow-orange-500/15",
  },
  administrative: {
    banner: "from-slate-400/20 via-slate-500/10 to-transparent dark:from-slate-400/15",
    iconWrap: "bg-slate-500/15 ring-slate-500/30",
    iconColor: "text-slate-700 dark:text-slate-300",
    borderHover: "group-hover:border-slate-400/50",
    chip: "bg-slate-500/10 text-slate-800 dark:text-slate-200",
    glow: "group-hover:shadow-slate-500/15",
  },
}

export function getModuleHubCardTheme(categoryId: NavCategoryId): ModuleHubCardTheme {
  return MODULE_HUB_CARD_THEME[categoryId] ?? DEFAULT_HUB_CARD
}
