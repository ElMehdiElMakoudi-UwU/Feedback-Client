"use client";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
          <h2>Something went wrong!</h2>
          <button onClick={() => retry()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
