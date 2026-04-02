import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Tiles Viewer",
  description: "Visualize Google Maps 3D Tiles (GLB format)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
