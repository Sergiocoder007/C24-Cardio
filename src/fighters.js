import { UFC_FIGHTERS } from './data/ufcFighters.js'

export const FALLBACK_ARTWORK = new URL('./assets/fighter-01.png', import.meta.url).href
export const FIGHTERS = UFC_FIGHTERS

export function normalizeFighterText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function filterFighters(query, fighters = FIGHTERS, { limit = 5 } = {}) {
  const needle = normalizeFighterText(query)
  if (needle.length < 2) return []
  const parts = needle.split(' ').filter(Boolean)
  return fighters
    .filter((fighter) => {
      const haystack = normalizeFighterText(
        [fighter.name, ...(fighter.aliases ?? [])].join(' '),
      )
      return parts.every((part) => haystack.includes(part))
    })
    .slice(0, limit)
}

export function withArtworkFallback(fighter) {
  if (!fighter) return null
  return {
    ...fighter,
    artwork: fighter.imageUrl || fighter.artwork || FALLBACK_ARTWORK,
  }
}
