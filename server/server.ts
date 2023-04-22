import express, { Router } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import { renderPage } from "vite-plugin-ssr/server";
import { root } from "./root.ts";
import { prisma } from "./db/prisma.ts";
import { initializePublishedPostCache } from "./db/redis.ts";
import adminApiRouter from "./routers/api/admin.ts";

const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  const posts = await prisma.post.findMany();

  await initializePublishedPostCache(posts);

  const app = express();

  app.use(cookieParser());
  app.use(compression());

  app.use("/api/admin", adminApiRouter);

  if (isProduction) {
    const sirv = (await import("sirv")).default;
    app.use(sirv(`${root}/dist/client`));
  } else {
    const vite = await import("vite");
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true },
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  }

  app.get("*", async (req, res, next) => {
    // pass custom http values to renderPage()
    const pageContextInit = {
      urlOriginal: req.originalUrl,
      headers: req.headers,
      cookies: req.cookies,
    };

    const pageContext = await renderPage(pageContextInit);

    // if (pageContext.redirectTo) {
    //   return res.redirect(307, pageContext.redirectTo);
    // }

    const { httpResponse } = pageContext;

    if (!httpResponse) return next();

    const { statusCode, contentType } = httpResponse;

    res.status(statusCode).type(contentType);

    httpResponse.pipe(res);
  });

  const port = process.env.PORT || 3000;
  app.listen(port);
  console.log(`🔶 startup: listening on http://localhost:${port}`);
}

startServer();
