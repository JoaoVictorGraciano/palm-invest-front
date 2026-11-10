/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da palm-invest-api (ex: http://localhost:8080). */
  readonly VITE_API_URL?: string;
  /** Token opcional da Brapi para cotações de ações. */
  readonly VITE_BRAPI_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
