import { APP_THEME_IDS, DEFAULT_APP_THEME } from "@/lib/app-themes"

/** Inline script: apply saved app theme on `<html>` before React hydrates (static export + public routes). */
export function buildThemeInitScript(
  storageKey = "transelgon-app-theme",
  fallback: string = DEFAULT_APP_THEME,
): string {
  const allowed = APP_THEME_IDS as readonly string[]
  const allowedJson = JSON.stringify([...allowed])
  return `(function(){try{var k=${JSON.stringify(storageKey)};var fb=${JSON.stringify(fallback)};var allowed=${allowedJson};var t=localStorage.getItem(k);var v=allowed.indexOf(t)>=0?t:fb;var el=document.documentElement;for(var i=0;i<allowed.length;i++)el.classList.remove(allowed[i]);el.classList.add(v);}catch(e){}})();`
}
