import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
export const metadata: Metadata = { title: { default: "OVERLEET | Think it through", template: "%s | OVERLEET" }, description: "Original, sourced interview practice for data science, machine learning, statistics, experiments and LLMs." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
