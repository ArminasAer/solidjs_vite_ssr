import { generateHydrationScript, renderToStream } from "solid-js/web";
import {
  escapeInject,
  dangerouslySkipEscape,
  stampPipe,
} from "vite-plugin-ssr/server";
import type { PageContextBuiltInClientWithServerRouting as PageContextBuiltInClient } from "vite-plugin-ssr/types";
import { PageContext } from "./types";
import { PageContextProvider } from "./PageLayout";

function render(pageContext: PageContextBuiltInClient & PageContext) {
  console.log("[SERVER RENDER]");

  const { Page, pageProps } = pageContext;

  const { documentProps, headers, cookies } = pageContext;
  const title = (documentProps && documentProps.title) || "EAC";

  // @ts-ignore
  // Page will be undefined if page is client side only
  if (Page) {
    const { pipe } = renderToStream(() => (
      <PageContextProvider
        navigation={!pageContext.urlPathname.includes("admin")}
        pageContext={pageContext}
      >
        <Page {...pageProps} />
      </PageContextProvider>
    ));
    stampPipe(pipe, "node-stream");

    return htmlInjection(
      title,
      true,
      pipe,
      cookies["theme"] || "dark",
      cookies["color"] || "green"
    );
  } else {
    return htmlInjection(
      title,
      false,
      "",
      cookies["theme"] || "dark",
      cookies["color"] || "green"
    );
  }
}

const htmlInjection = (
  title: string,
  scripts: boolean,
  pipe: ((writable: { write: (v: string) => void }) => void) | "",
  theme: string,
  color: string
) => {
  return escapeInject`<!DOCTYPE html>
<html lang="en" data-theme="${theme}" data-color="${color}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="EricArthurC" />
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;500;600;700&display=swap"
        rel="stylesheet">
    ${scripts ? dangerouslySkipEscape(generateHydrationScript()) : ""}
  </head>
  <body>
    <div id="root">${pipe}</div>
    ${
      scripts
        ? ""
        : dangerouslySkipEscape("<noscript>Enable JavaScript</noscript>")
    }
  </body>
</html>`;
};

export default render;