export {};

declare global {
  interface Window {
    /** Called by the Maps JavaScript API when it rejects the API key */
    gm_authFailure?: () => void;
  }
}
