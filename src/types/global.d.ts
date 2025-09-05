// /src/types/global.d.ts

interface Window {
  // Extend the Window interface to include the gtag function
  // for Google Analytics, preventing the need for `as any`.
  gtag?: (
    command: 'event',
    action: string,
    params: {
      [key: string]: any;
    }
  ) => void;
}
