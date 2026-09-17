import type { PropsWithChildren } from "react";

export type AppShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function AppShell({
  children,
  description,
  eyebrow,
  title,
}: AppShellProps) {
  return (
    <main
      style={{
        margin: "0 auto",
        maxWidth: 960,
        padding: "80px 24px",
      }}
    >
      <p style={{ color: "#0f766e", fontWeight: 700, letterSpacing: "0.12em" }}>
        {eyebrow.toUpperCase()}
      </p>
      <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", margin: "16px 0" }}>
        {title}
      </h1>
      <p style={{ color: "#475569", fontSize: "1.125rem", lineHeight: 1.7 }}>
        {description}
      </p>
      {children}
    </main>
  );
}
