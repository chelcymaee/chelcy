import { Platform } from 'react-native';

// Logs errors that React's render-time ErrorBoundary can't catch — thrown
// promises, event handler exceptions, unhandled rejections. Does not change
// crash/recovery behavior, only ensures these are never silently swallowed.
export function setupGlobalErrorLogging() {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (event) => {
      console.error('[GlobalError] Uncaught error:', event.error ?? event.message);
    });
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[GlobalError] Unhandled promise rejection:', event.reason);
    });
    return;
  }

  const globalAny = globalThis as any;
  if (globalAny.ErrorUtils?.setGlobalHandler) {
    const defaultHandler = globalAny.ErrorUtils.getGlobalHandler?.();
    globalAny.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      console.error(`[GlobalError] ${isFatal ? 'Fatal' : 'Non-fatal'} error:`, error);
      defaultHandler?.(error, isFatal);
    });
  }
}
