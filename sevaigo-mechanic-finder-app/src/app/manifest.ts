import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SevaiGo — 3D Motorcycle Service & Maintenance",
    short_name: "SevaiGo",
    description: "Your Bike, Our Priority. Experience premium 3D motorcycle servicing, verified mechanics, live service tracking, and doorstep bike care.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090C",
    theme_color: "#FF7900",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/sevaigo-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
