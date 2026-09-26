import path from "node:path";

type Rewrite = { source: string; destination: string };

export async function readRoutes(root: string): Promise<Rewrite[]> {
  const config = await Bun.file(path.join(root, "vercel.json")).json();
  if (!Array.isArray(config.rewrites)) throw new Error("vercel.json: missing rewrites");
  return config.rewrites.map((route: Rewrite) => {
    if (typeof route.source !== "string" || typeof route.destination !== "string") {
      throw new Error("vercel.json: each rewrite requires a source and destination");
    }
    return route;
  });
}

export function resolveRoute(pathname: string, routes: Rewrite[]): string | null {
  if (pathname.startsWith("/static/")) return pathname;
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  const exact = routes.find(route => route.source === cleanPath);
  if (exact) return exact.destination;
  const post = cleanPath.match(/^\/writing\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  const writing = routes.find(route => route.source === "/writing/:slug");
  return post && writing ? writing.destination.replace(":slug", post[1]!) : null;
}

export function validateRoutes(pages: string[], routes: Rewrite[]) {
  for (const page of [...pages, "writing.html"]) {
    const url = page === "index.html" ? "/" : `/${page.slice(0, -5)}`;
    if (resolveRoute(url, routes) !== `/pages/${page}`) {
      throw new Error(`vercel.json: missing or incorrect rewrite for ${url} → /pages/${page}`);
    }
  }
  if (resolveRoute("/writing/example", routes) !== "/pages/writing/example.html") {
    throw new Error("vercel.json: missing or incorrect /writing/:slug rewrite");
  }
}
