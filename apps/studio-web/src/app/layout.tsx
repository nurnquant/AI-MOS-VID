import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AIVS Studio",
  description: "Riwaq Al Ilm Enterprise AI Video Production Studio",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/status", label: "Environment Status" },
  { href: "#", label: "Projects (soon)" },
  { href: "/assets", label: "Assets" },
  { href: "#", label: "Publishing (soon)" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <nav
          style={{
            display: "flex",
            gap: "1rem",
            padding: "1rem",
            borderBottom: "1px solid #ddd",
          }}
        >
          <strong>AIVS Studio</strong>
          {navItems.map((item) => (
            <a key={item.label} href={item.href} style={{ textDecoration: "none" }}>
              {item.label}
            </a>
          ))}
        </nav>
        <main style={{ padding: "1.5rem" }}>{children}</main>
      </body>
    </html>
  );
}
