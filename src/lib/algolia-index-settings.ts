/**
 * Algolia index settings for remember_enterprise.
 * Indexes: DM partners (users), groups, and messages.
 */

export const ALGOLIA_INDEX_SETTINGS = {
  searchableAttributes: [
    'search',         // combined searchable text
    'name',           // conversation/group name, user displayName
    'content',        // message content
  ],

  attributesForFaceting: [
    'filterOnly(type)',              // dm_partner, group, message
    'filterOnly(participant_ids)',   // for scoping to user's conversations
    'filterOnly(conversation_id)',   // for scoping messages to a conversation
  ],

  customRanking: [
    'desc(updated_at_ts)',
  ],

  attributesToRetrieve: [
    'objectID', 'type', 'name', 'search', 'content',
    'conversation_id', 'participant_ids',
    'photo_url', 'email',
    'description', 'sender_name',
    'created_at', 'updated_at',
  ],

  attributesToHighlight: ['search', 'name', 'content'],

  attributesToSnippet: ['content:40'],

  hitsPerPage: 15,
  maxValuesPerFacet: 100,
  typoTolerance: true as const,
  minWordSizefor1Typo: 3,
  minWordSizefor2Typos: 7,
} as const
