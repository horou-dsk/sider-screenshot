import type { SearchEngine } from './searchEngine'
import type { ISearchService } from './service'
import type { SearchResult } from './types'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { EmitterEvent, EventType } from './event'
import { ProxyChannel } from './proxy_channel'
import { defaultEngines } from './searchEngine'

if (document.readyState === 'complete') {
  main()
}
else {
  window.addEventListener('load', () => {
    main()
  })
}

class SearchService implements ISearchService {
  private proxyChannel: ProxyChannel
  constructor() {
    const emitter = new EmitterEvent(getCurrentWindow().label)
    this.proxyChannel = new ProxyChannel(emitter)
    this.proxyChannel.registerChannel('searchService', this)
    emitter.emit(EventType.WebSearchDomReady)
  }

  async getSearchItem(engine: SearchEngine): Promise<SearchResult[]> {
    const _engine = defaultEngines.find(e => e.id === engine)
    if (!_engine)
      throw new Error(`Engine ${engine} not found`)

    return _engine.getSearchItem()
  }
}
async function main() {
  new SearchService()
}
