/**
 * Centralized environment config — single source of truth for
 * all feature flags and API endpoints used by the renderer.
 *
 * Reads from Vite env vars (client/.env) prefixed with VITE_.
 * Every service URL in the project should import from here —
 * no hardcoded 'http://localhost:...' anywhere else.
 */

/** Whether to use mock data instead of real API calls */
export const USE_MOCK: boolean =
  import.meta.env.VITE_USE_MOCK === 'true';

/** Base URL for the NestJS API gateway */
export const API_BASE: string =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api/v1';

/** CrewAI Python service */
export const CREWAI_SERVICE_URL: string =
  import.meta.env.VITE_CREWAI_URL ?? 'http://localhost:8001';

/** LangGraph Python service */
export const LANGGRAPH_SERVICE_URL: string =
  import.meta.env.VITE_LANGGRAPH_URL ?? 'http://localhost:8002';

/** Go deploy-service */
export const DEPLOY_SERVICE_URL: string =
  import.meta.env.VITE_DEPLOY_URL ?? 'http://localhost:8082';

/** Local Ollama API */
export const OLLAMA_URL: string =
  import.meta.env.VITE_OLLAMA_URL ?? 'http://localhost:11434';
