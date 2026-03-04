/** Tailwindのclassを条件付きで結合するユーティリティ */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
