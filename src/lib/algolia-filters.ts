/**
 * AlgoliaFilters — fluent builder for Algolia filter strings.
 * Enforces Algolia's constraint: (OR group) AND (OR group) AND condition.
 * Ported from goodneighbor-core with remember-enterprise convenience methods.
 */

type FilterPart =
  | { kind: 'or_group'; conditions: string[] }
  | { kind: 'and'; condition: string }

export class AlgoliaFilters {
  private parts: FilterPart[] = []
  private currentOrGroup: string[] = []

  /** Start a new OR group. Flushes current OR group if non-empty. */
  newOrGroup(): this {
    this.flushCurrentOrGroup()
    return this
  }

  /** Add a condition to the current OR group. */
  addOr(condition: string): this {
    this.currentOrGroup.push(condition)
    return this
  }

  /** Add a complete OR group as an array of conditions. */
  addOrGroup(conditions: string[]): this {
    this.flushCurrentOrGroup()
    if (conditions.length > 0) {
      this.parts.push({ kind: 'or_group', conditions: [...conditions] })
    }
    return this
  }

  /** Add a standalone AND condition. */
  addAnd(condition: string): this {
    this.flushCurrentOrGroup()
    this.parts.push({ kind: 'and', condition })
    return this
  }

  /** Add multiple standalone AND conditions. */
  addAnds(conditions: string[]): this {
    this.flushCurrentOrGroup()
    for (const c of conditions) {
      this.parts.push({ kind: 'and', condition: c })
    }
    return this
  }

  /** Build the final Algolia filter string. */
  getFilter(): string {
    this.flushCurrentOrGroup()
    const segments: string[] = []
    for (const part of this.parts) {
      if (part.kind === 'and') {
        segments.push(part.condition)
      } else {
        if (part.conditions.length === 1) {
          segments.push(part.conditions[0])
        } else if (part.conditions.length > 1) {
          segments.push(`(${part.conditions.join(' OR ')})`)
        }
      }
    }
    return segments.join(' AND ')
  }

  isEmpty(): boolean {
    return this.parts.length === 0 && this.currentOrGroup.length === 0
  }

  reset(): this {
    this.parts = []
    this.currentOrGroup = []
    return this
  }

  clone(): AlgoliaFilters {
    const copy = new AlgoliaFilters()
    copy.parts = this.parts.map((p) =>
      p.kind === 'and'
        ? { ...p }
        : { kind: 'or_group' as const, conditions: [...p.conditions] },
    )
    copy.currentOrGroup = [...this.currentOrGroup]
    return copy
  }

  // --- Convenience methods for remember-enterprise ---

  /** Filter to entities where user is a participant. */
  addParticipant(userId: string): this {
    this.addAnd(`participant_ids:${userId}`)
    return this
  }

  /** Add entity type filter (dm, group, message). */
  addType(type: string): this {
    this.addAnd(`type:${type}`)
    return this
  }

  /** Add entity type to current OR group. */
  addOrType(type: string): this {
    this.addOr(`type:${type}`)
    return this
  }

  /** Filter to a specific conversation. */
  addConversation(conversationId: string): this {
    this.addAnd(`conversation_id:${conversationId}`)
    return this
  }

  // --- Static factories ---

  static create(): AlgoliaFilters {
    return new AlgoliaFilters()
  }

  static fromString(filterString: string): AlgoliaFilters {
    const instance = new AlgoliaFilters()
    if (filterString && filterString.trim().length > 0) {
      instance.addAnd(filterString.trim())
    }
    return instance
  }

  private flushCurrentOrGroup(): void {
    if (this.currentOrGroup.length > 0) {
      this.parts.push({ kind: 'or_group', conditions: [...this.currentOrGroup] })
      this.currentOrGroup = []
    }
  }
}
