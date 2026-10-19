import { useState, useEffect } from 'react';

// Lightweight custom router that stays resilient in Vite dev, preview, or static deployments
export function getRoutePath(): string {
  if (typeof window === 'undefined') return '/';
  
  // Support both hash routing #/games/... and pathname /games/...
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('/')) {
    const cleanRoute = hash.replace(/#.*$/, '');
    return cleanRoute || '/';
  }
  return window.location.pathname || '/';
}

export function navigate(path: string): void {
  if (typeof window === 'undefined') return;
  
  // Handle in-page anchors like /#featured or #featured
  const hashIndex = path.indexOf('#');
  if (hashIndex !== -1) {
    const anchorId = path.slice(hashIndex + 1).replace(/^\//, '');
    const targetRoute = path.slice(0, hashIndex) || '/';
    const currentRoute = getRoutePath();

    if (currentRoute !== targetRoute) {
      window.location.hash = targetRoute;
      window.dispatchEvent(new Event('routechange'));
      setTimeout(() => {
        if (anchorId === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const el = document.getElementById(anchorId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
    } else {
      if (anchorId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById(anchorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
    return;
  }

  // Use hash routing for static hosting safety while keeping clean URLs
  window.location.hash = path;
  window.dispatchEvent(new Event('routechange'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function useCurrentRoute(): string {
  const [route, setRoute] = useState<string>(() => getRoutePath());

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(getRoutePath());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('routechange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('routechange', handleLocationChange);
    };
  }, []);

  return route;
}
