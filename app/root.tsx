import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

/*
 * 🌍 Root Layout
 * ────────────────────────────────────────────
 * The outermost shell. The hull of the hull.
 * Everything renders inside here, like a dream
 * within a dream within a <div>.
 */

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Houston, we have a problem.";
  let details = "Something went wrong out here in the void.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404 — Lost in Space" : "Error";
    details =
      error.status === 404
        ? "This sector of space appears to be empty."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex h-screen items-center justify-center bg-black p-4 font-mono text-white">
      <div className="max-w-lg text-center">
        <h1 className="mb-4 text-2xl tracking-widest text-red-400">
          {message}
        </h1>
        <p className="text-white/60">{details}</p>
        {stack && (
          <pre className="mt-6 max-h-64 overflow-auto rounded border border-white/10 bg-white/5 p-4 text-left text-xs text-white/40">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
