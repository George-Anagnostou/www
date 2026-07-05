import { inject } from "@vercel/analytics";

declare const __VERCEL_ANALYTICS_MODE__: "development" | "production";

inject({
  framework: "custom",
  mode: __VERCEL_ANALYTICS_MODE__,
});
