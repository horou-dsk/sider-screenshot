import type { SearchEngine } from './searchEngine'
import type { SearchResult } from './types'

export interface ISearchService {
  getSearchItem(engine: SearchEngine): Promise<SearchResult[]>
}
