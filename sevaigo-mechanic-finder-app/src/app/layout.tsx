import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SevaiGo — 3D Motorcycle Service & Maintenance",
  description: "Your Bike, Our Priority. Experience premium 3D motorcycle servicing, verified mechanics, live service tracking, and doorstep bike care.",
  applicationName: "SevaiGo",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SevaiGo" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF7900",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
