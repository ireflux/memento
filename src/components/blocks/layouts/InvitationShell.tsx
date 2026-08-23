import type { CSSProperties, ReactNode } from "react";
import type { ThemeTokens } from "@/templates/types";

export function themeCssVars(theme: ThemeTokens): CSSProperties {
  return {
    "--tk-surface": theme.surface,
    "--tk-primary": theme.primary,
    "--tk-primary-soft": theme.primarySoft,
    "--tk-text": theme.text,
    "--tk-muted": theme.mutedText,
    "--tk-button-bg": theme.buttonBg,
    "--tk-button-text": theme.buttonText,
    "--tk-font-display": theme.fontDisplay,
    fontFamily: theme.fontBody,
    background: theme.bgGradient || theme.bg,
    color: theme.text,
  } as CSSProperties;
}

export function InvitationShell({
  theme,
  children,
  className = "",
  fill = false,
}: {
  theme: ThemeTokens;
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <div
      style={themeCssVars(theme)}
      className={`${fill ? "h-full" : "min-h-dvh"} ${className}`}
    >
      {children}
    </div>
  );
}
