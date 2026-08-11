/**
 * Centralized environment config — single source of truth for
 * all feature flags and API endpoints used by the renderer.
 *
 * Reads from Vite env vars (client/.env) prefixed with VITE_.
 * All former `const USE_MOCK = true` in page files should import
 * from here instead.
 */

/** Whether to use mock data instead of real API calls */
export const USE_MOCK: boolean =
  import.meta.env.VITE_USE_MOCK === 'true';

/** Base URL for the NestJS API gateway */
export const API_BASE: string =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api/v1';
