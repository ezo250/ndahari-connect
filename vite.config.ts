import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

// Dev-only plugin: handles /api/ndahari POST requests during `vite dev`
function ndahariApiPlugin(): Plugin {
  return {
    name: "ndahari-api-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/ndahari", async (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405);
          res.end("Method Not Allowed");
          return;
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks).toString("utf-8");
          const payload = JSON.parse(body || "{}");

          // Dynamically import so it runs in Node context with env vars
          const { handleMongoRequest } = await import("./src/lib/mongo.ts");
          const result = await handleMongoRequest(payload);

          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err) {
          console.error("[ndahari-api-dev]", err);
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: String(err) } }));
        }
      });
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [ndahariApiPlugin()],
  },
  tanstackStart: {
    server: { entry: "server" },
    nitro: {
      externals: {
        external: ["mongodb", "whatwg-url", "tr46", "webidl-conversions"],
      },
    },
  },
});
