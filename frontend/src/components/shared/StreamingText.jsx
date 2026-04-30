import { useEffect, useRef } from "react";

/**
 * Renders text that may grow token-by-token.
 * Uses a ref to append text directly to the DOM so React reconciliation
 * never clears an active browser text selection.
 */
export default function StreamingText({ text, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = text;
    }
  }, [text]);

  return <div ref={ref} className={`streaming-text ${className}`} />;
}
