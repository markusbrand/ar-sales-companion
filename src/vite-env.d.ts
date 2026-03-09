/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_BYNDER_BASE_URL: string;
  readonly VITE_OAUTH_CALLBACK_URL: string;
  readonly VITE_OAUTH_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        'ios-src'?: string;
        poster?: string;
        'environment-image'?: string;
        'shadow-intensity'?: string;
        'camera-controls'?: boolean;
        ar?: boolean;
        'ar-modes'?: string;
        alt?: string;
      },
      HTMLElement
    >;
  }
}
