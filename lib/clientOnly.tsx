// A client-only lazy component: React.lazy behind a mount guard, so it never
// renders on the server and its chunk loads only when it first renders.
//
// This replaces next/dynamic({ ssr: false }) on purpose. Every lazy piece on
// the site is client-only, and next/dynamic pulls its loadable runtime and
// use-subscription into the page's first load (about 3 kB gzipped) to support
// SSR preloading that these components never use. React.lazy is already in
// the framework chunk.
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";

export function clientOnly<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  // The cast only drops the ref typing React.lazy adds; these components take no ref.
  const Lazy = lazy(load) as unknown as ComponentType<P>;
  function ClientOnly(props: P) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  }
  return ClientOnly;
}
