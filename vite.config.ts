import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        // Grade files get separate cache entries; changing one grade does not invalidate all content.
        // These remain eager imports so the existing offline reader stays synchronous.
        codeSplitting: {
          groups: ["d1", "d2", "d3", "d4", "d5", "d6", "t1", "t2", "t3", "t4", "t5", "t6"].map(grade => ({
            name: `library-${grade}`,
            test: new RegExp(`/server/library/expansion/${grade}\\.json$`),
            priority: 20,
          })),
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "inline",
      // Inline registration needs explicit activation options in this plugin.
      workbox: { skipWaiting: true, clientsClaim: true, globPatterns: ["**/*.{js,wasm,css,html,webp}"] },
      includeAssets: ["icons/academy-apple-180.png", "icons/academy-favicon-32.png", "donation/duitnow-nik-azfar.jpg"],
      manifest: {
        id: "/",
        name: "IMAI Study Malaysia",
        short_name: "IMAI Study",
        description: "Ulang kaji KSSR, KSSM, SPM dan STPM",
        lang: "ms-MY",
        theme_color: "#1569e8",
        background_color: "#f4f8ff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        prefer_related_applications: false,
        icons: [
          { src: "/icons/academy-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/academy-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/academy-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
