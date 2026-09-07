"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary — catches render-time exceptions and shows a useful message
 * instead of letting them bubble up to Next.js's "This page couldn't load" wall.
 *
 * Logs the error to the server (Upstash) so we can see what crashed remotely.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Fire-and-forget log — never throws back to the user
    fetch("/api/debug/error-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: this.props.label || "unknown",
        message: error?.message || String(error),
        stack: error?.stack || null,
        componentStack: errorInfo?.componentStack || null,
        timestamp: new Date().toISOString(),
        ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    }).catch(() => { /* ignore logging failures */ });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== "undefined") {
      // Clear the tasks-layout flag in case it's poisoned
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.30)",
          borderRadius: 14,
          padding: "24px 28px",
          margin: "32px auto",
          maxWidth: 680,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#fff",
        }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#f87171" }}>
            {this.props.label ? `${this.props.label} crashed` : "Tab crashed"}
          </h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            Something in this tab threw an exception. The error has been logged.
          </p>
          {this.state.error && (
            <pre style={{
              background: "rgba(0,0,0,0.4)",
              padding: "12px 14px",
              borderRadius: 10,
              fontSize: 11,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.85)",
              overflow: "auto",
              maxHeight: 220,
              margin: "0 0 16px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack?.split("\n").slice(0, 12).join("\n")}
            </pre>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={this.handleReset}
              style={{
                background: "#f87171", color: "#000", border: "none",
                borderRadius: 8, padding: "8px 16px", fontSize: 13,
                fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Reload page</button>
            <button
              onClick={() => {
                // Clear potentially poisoned caches then reset
                try {
                  localStorage.removeItem("mc_tasks_layout");
                  localStorage.removeItem("mc_dismissed_onboardings");
                } catch { /* ignore */ }
                if (typeof window !== "undefined") window.location.reload();
              }}
              style={{
                background: "transparent", color: "#fff",
                border: "1px solid rgba(255,255,255,0.20)",
                borderRadius: 8, padding: "8px 16px", fontSize: 13,
                fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>Clear local cache & reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
