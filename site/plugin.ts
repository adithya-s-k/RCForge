import type { Plugin } from "vite";
import { buildDocs, type SiteFile } from "./build.ts";
import { cachedPlan, readReferences } from "../references/library.ts";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

/** Same static HTML in development and production; no simulator code on /docs. */
export function documentationPlugin(): Plugin {
  let root = process.cwd();
  let cached: Map<string, SiteFile> | undefined;
  const content = () => (cached ??= buildDocs(root, true));
  return {
    name: "rcforge-documentation",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.watcher.on("all", (_event, path) => {
        if (
          /\.(md|json|css|js)$/.test(path) &&
          !/[\/](node_modules|dist|results|\.git)[\/]/.test(path)
        )
          cached = undefined;
      });
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url ?? "/", "http://localhost").pathname;
        if (path !== "/docs" && !path.startsWith("/docs/")) return next();
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.statusCode = 405;
          res.end();
          return;
        }
        try {
          if (path.startsWith("/docs/local-plans/")) {
            const plan = readReferences(root).plans.find(
              (p) => path === `/docs/local-plans/${p.id}.pdf`,
            );
            const data = plan ? cachedPlan(root, plan) : undefined;
            if (!data) {
              res.statusCode = 404;
              res.end(
                "Plan is not cached. Run npm run references:fetch locally.",
              );
              return;
            }
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.end(req.method === "HEAD" ? undefined : data);
            return;
          }
          let decoded: string;
          try {
            decoded = decodeURIComponent(path);
          } catch {
            res.statusCode = 400;
            res.end("Invalid path");
            return;
          }
          const key = decoded.endsWith("/") ? decoded + "index.html" : decoded;
          const match =
            content().get(key) ?? content().get(decoded + "/index.html");
          if (match && !decoded.endsWith("/") && !/\.[a-z]+$/i.test(decoded)) {
            res.statusCode = 308;
            res.setHeader("Location", decoded + "/");
            res.end();
            return;
          }
          const output = match ?? content().get("/docs/404.html")!;
          res.statusCode = match ? 200 : 404;
          res.setHeader("Content-Type", output.type);
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Cache-Control", "no-cache");
          res.end(req.method === "HEAD" ? undefined : output.data);
        } catch (error) {
          next(error);
        }
      });
    },
    configurePreviewServer(server) {
      // Preview must exercise the built artifact, including real 404s, not SPA fallback.
      const output = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url ?? "/", "http://localhost").pathname;
        if (path !== "/docs" && !path.startsWith("/docs/")) return next();
        let decoded: string;
        try {
          decoded = decodeURIComponent(path);
        } catch {
          res.statusCode = 400;
          res.end();
          return;
        }
        const target = resolve(output, decoded.slice(1));
        if (target.startsWith(output + sep) && existsSync(target)) {
          if (statSync(target).isDirectory() && !path.endsWith("/")) {
            res.statusCode = 308;
            res.setHeader("Location", path + "/");
            res.end();
            return;
          }
          return next();
        }
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(
          req.method === "HEAD"
            ? undefined
            : readFileSync(resolve(output, "docs/404.html")),
        );
      });
    },
    generateBundle() {
      for (const [path, file] of buildDocs(root))
        this.emitFile({
          type: "asset",
          fileName: path.slice(1),
          source:
            typeof file.data === "string"
              ? file.data
              : new Uint8Array(file.data),
        });
      for (const [name, path] of Object.entries({
        "RCForge-MIT.txt": "LICENSE",
        "THIRD_PARTY_NOTICES.md": "THIRD_PARTY_NOTICES.md",
        "DM-Sans-OFL.txt": "node_modules/@fontsource/dm-sans/LICENSE",
        "Space-Grotesk-OFL.txt":
          "node_modules/@fontsource/space-grotesk/LICENSE",
        "Three-MIT.txt": "node_modules/three/LICENSE",
        "Zod-MIT.txt": "node_modules/zod/LICENSE",
      }))
        this.emitFile({
          type: "asset",
          fileName: `licenses/${name}`,
          source: readFileSync(resolve(root, path), "utf8"),
        });
    },
  };
}
