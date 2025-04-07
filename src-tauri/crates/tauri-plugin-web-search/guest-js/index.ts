import type { SearchEngine } from './searchEngine'
import type { ISearchService } from './service'
import type { SearchResult } from './types'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import domReadyJs from '../dist-js/dom-ready.js?raw'
import { EmitterEvent, EventType } from './event'
import { ProxyChannel } from './proxy_channel'
import { defaultEngines } from './searchEngine'

export * from './searchEngine'

class CreatedListen {
  private label: string | null = null
  private callback: ((label: string) => void) | null = null

  public onCreated = (callback: (label: string) => void) => {
    if (this.label) {
      callback(this.label)
      this.label = null
    }
    else {
      this.callback = callback
    }
  }

  public pushLabel = (label: string) => {
    this.label = label
    if (this.callback) {
      this.callback(label)
      this.callback = null
      this.label = null
    }
  }
}

export class WebSearch {
  private isReady = false

  private searchService: ISearchService

  private proxyChannel: ProxyChannel

  private constructor(private id: number, private emitter: EmitterEvent, createdListen: CreatedListen) {
    this.proxyChannel = new ProxyChannel(emitter)
    this.searchService = this.proxyChannel.getProxy<ISearchService>('searchService')
    this.emitter.listen(EventType.WebSearchDomReady, this.onDomReady)
    createdListen.onCreated((label) => {
      console.log('webview created', label)
      if (label === `web_search_${this.id}`) {
        this.evalJs().catch((err) => {
          console.error('eval js error', err)
        })
      }
    })
  }

  public static async create(): Promise<WebSearch> {
    const createdListen = new CreatedListen()
    getCurrentWindow().once<{ label: string }>('tauri://window-created', (event) => {
      createdListen.pushLabel(event.payload.label)
    })
    const id = await invoke<number>('plugin:web-search|create_search_window')
    return new WebSearch(id, new EmitterEvent(`web_search_${id}`), createdListen)
  }

  private onDomReady = () => {
    console.log('dom ready')
    this.isReady = true
  }

  private async waitReady(): Promise<unknown | undefined> {
    if (this.isReady) return
    return this.emitter.once(EventType.WebSearchDomReady)
  }

  public async loadUrl(url: string): Promise<void> {
    await this.waitReady()
    await invoke('plugin:web-search|load_url', {
      id: this.id,
      url,
    })
    this.isReady = false
    await this.evalJs()
  }

  private async evalJs(): Promise<void> {
    await invoke('plugin:web-search|eval_js', { id: this.id, js: domReadyJs })
  }

  public async drop(): Promise<void> {
    await invoke('plugin:web-search|remove_search_window', {
      id: this.id,
    })
  }

  public async search(engine: SearchEngine, query: string): Promise<SearchResult[]> {
    const _engine = defaultEngines.find(e => e.id === engine)
    if (!_engine)
      throw new Error(`Engine ${engine} not found`)

    await this.loadUrl(_engine.searchUrl.replace('{query}', query))
    await this.waitReady()
    return this.searchService.getSearchItem(engine)
  }
}
