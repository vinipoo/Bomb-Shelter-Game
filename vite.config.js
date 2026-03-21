import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  base: "/Bomb-Shelter-Game/",
  server: {
    proxy: {
      "/oref-proxy": {
        target: "https://www.oref.org.il",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/oref-proxy/, ""),
        headers: {
          "Referer": "https://www.oref.org.il/",
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    },
  },
})
