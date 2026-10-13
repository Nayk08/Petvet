import { useEffect, useRef, useState } from "react";

// Width of the element `ref` is attached to, kept live. Charts draw at this
// width: a fixed viewBox scaled to fit shrank 10px labels to ~5px on phones
// and blew bars up on tablets.
export default function useBoxWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.max(240, Math.round(e.contentRect.width))),
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
