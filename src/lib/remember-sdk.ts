/**
 * Remember SDK Factory
 *
 * Creates SvcClient from @prmichaelsen/remember-core for server-side
 * memory operations (search, CRUD). Configuration via environment variables.
 */

import { createSvcClient } from '@prmichaelsen/remember-core/clients/svc/v1'
import type { SvcClient } from '@prmichaelsen/remember-core/clients/svc/v1'

function getEnv(key: string): string {
  const value =
    (globalThis as any).process?.env?.[key] ??
    (typeof process !== 'undefined' ? process.env[key] : undefined)
  if (!value) throw new Error(`${key} environment variable is not set`)
  return value
}

let cachedSvcClient: SvcClient | null = null

export async function getRememberSvcClient(): Promise<SvcClient> {
  if (cachedSvcClient) return cachedSvcClient

  const baseUrl = getEnv('REMEMBER_SVC_BASE_URL')
  const serviceToken = getEnv('REMEMBER_SVC_SERVICE_TOKEN')

  cachedSvcClient = createSvcClient({
    baseUrl,
    auth: {
      serviceToken,
      jwtOptions: {
        issuer: 'remember-enterprise',
        audience: 'svc',
        expiresIn: '1h',
      },
    },
  })

  return cachedSvcClient
}
