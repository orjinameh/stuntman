import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./awwwards.css"; // presentation layer: delete this line to undo the restyle

export const metadata: Metadata = {
  title: "Stuntman: the customer saw $49, the server charged $61",
  description:
    "Stuntman plays the customers nobody wrote a test for, proves bugs in a real browser, locks the test before the fix, and re-audits the repair. Try the checkout hazard yourself.",
};

export const viewport: Viewport = { themeColor: "#f6efe6", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
