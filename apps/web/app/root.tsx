import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import { nonceContext } from "./security";
// Self-hosted, subset fonts (no third-party font requests).
import "@fontsource/limelight/latin-400.css";
import "@fontsource-variable/jost/wght.css";
import "./styles/global.css";

/** Hands the per-request CSP nonce to <Scripts>; never re-fetched on client navigation. */
export function loader({ context }: Route.LoaderArgs) {
  return { nonce: context.get(nonceContext) };
}
export const shouldRevalidate = () => false;

export function Layout({ children }: { children: React.ReactNode }) {
  const nonce = useRouteLoaderData<typeof loader>("root")?.nonce;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0b0e13" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Lost in the dark";
  let details = "Something went wrong on the way down.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "This passage doesn't exist." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main
      style={{
        padding: "4rem var(--space-gutter)",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold-400)" }}>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre style={{ overflowX: "auto", padding: "1rem" }}>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
