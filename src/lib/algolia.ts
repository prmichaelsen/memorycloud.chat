/**
 * Algolia client factory — adapted from goodneighbor-core.
 * Uses env vars: ALGOLIA_APPLICATION_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_SEARCH_API_KEY
 */

import { algoliasearch } from 'algoliasearch'

export const ALGOLIA_INDEX_NAME =
  process.env.ALGOLIA_INDEX_NAME ?? 'remember_enterprise'

let adminClient: ReturnType<typeof algoliasearch> | null = null
let searchClient: ReturnType<typeof algoliasearch> | null = null

export function getAlgoliaAdminClient() {
  if (adminClient) return adminClient
  const appId = process.env.ALGOLIA_APPLICATION_ID
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY
  if (!appId || !apiKey) {
    throw new Error('[algolia] ALGOLIA_APPLICATION_ID and ALGOLIA_ADMIN_API_KEY must be set')
  }
  adminClient = algoliasearch(appId, apiKey)
  return adminClient
}

export function getAlgoliaSearchClient() {
  if (searchClient) return searchClient
  const appId = process.env.ALGOLIA_APPLICATION_ID
  const apiKey = process.env.ALGOLIA_SEARCH_API_KEY
  if (!appId || !apiKey) {
    throw new Error('[algolia] ALGOLIA_APPLICATION_ID and ALGOLIA_SEARCH_API_KEY must be set')
  }
  searchClient = algoliasearch(appId, apiKey)
  return searchClient
}
