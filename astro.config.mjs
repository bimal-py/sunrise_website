import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = process.env.PUBLIC_SITE_URL ?? "https://sunrisedigitalphotostudio.com.np";

export default defineConfig({
  site,
  output: "static",
  integrations: [sitemap()],
  vite: {
    server: {
      host: true,
      allowedHosts: [
        "decision-qualified-knew-continually.trycloudflare.com"
      ]
    }
  }
});
