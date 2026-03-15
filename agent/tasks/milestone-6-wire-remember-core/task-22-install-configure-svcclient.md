# Task 22: Install + Configure SvcClient

**Milestone**: [M6 - Wire remember-core](../../milestones/milestone-6-wire-remember-core.md)
**Design Reference**: [Requirements](../../design/local.requirements.md)
**Estimated Time**: 1-2 hours
**Dependencies**: None
**Status**: Not Started

---

## Objective

Install `@prmichaelsen/remember-core` and create the singleton SvcClient initialization module, matching agentbase.me's proven pattern.

---

## Steps

### 1. Install remember-core
- `npm i @prmichaelsen/remember-core@latest`

### 2. Create `src/lib/remember-sdk.ts`
Follow agentbase.me's pattern at `~/.acp/projects/agentbase.me/src/lib/remember-sdk.ts`:

```typescript
import { createSvcClient } from '@prmichaelsen/remember-core/clients/svc/v1'
```

- Read config from shared Firestore `REST_API_CONFIGURATIONS` collection where `provider='remember'` and `status='active'`
- Extract `base_url` and `service_token`
- Fallback: check `MCP_SERVERS` collection if REST config not found
- Create client with JWT config: `issuer: 'remember-enterprise'`, `audience: 'svc'`, `expiresIn: '1h'`
- Cache client as singleton (`let cachedSvcClient`)
- Export `getRememberSvcClient(): Promise<SvcClient>`

### 3. Create RestApiConfigurationService
- `src/services/rest-api-configuration-database.service.ts`
- Static method: `getByProvider(provider: string)` — queries Firestore for active config
- Uses `queryDocuments` from firebase-admin-sdk-v8
- Collection path: matches agentbase.me's `REST_API_CONFIGURATIONS`

### 4. Verify
- Import and call `getRememberSvcClient()` in a test route
- Confirm it reads config from Firestore and creates client

---

## Verification

- [ ] `@prmichaelsen/remember-core` in package.json dependencies
- [ ] `src/lib/remember-sdk.ts` exports `getRememberSvcClient()`
- [ ] Config reads from shared Firestore (same collection as agentbase.me)
- [ ] Service token JWT auth configured
- [ ] Singleton caching works (one client per process)
- [ ] Graceful error when config not found in Firestore
