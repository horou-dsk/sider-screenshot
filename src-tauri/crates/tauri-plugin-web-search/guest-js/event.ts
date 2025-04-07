import { getCurrentWindow } from '@tauri-apps/api/window'
import Emittery, { type UnsubscribeFunction } from 'emittery'
import { nanoid } from 'nanoid'

export enum EventType {
  WebSearchDomReady = 'web_search_dom_ready',
  GetGoogleSearchResultItem = 'get_google_search_result_item',
  SearchResultItem = 'search_result_item',
}

export class EmitterEvent {
  private emitter = new Emittery()

  private id = nanoid()

  constructor(private window_label: string) {
    getCurrentWindow().listen(`web_search://${this.window_label}`, (event) => {
      const payload = event.payload as {
        id: string
        eventName: string
        data: unknown
      }
      if (payload.id === this.id) return
      this.emitter.emit(payload.eventName, payload.data)
    })
  }

  public listen(event: string, callback: (data: unknown) => void | Promise<void>): UnsubscribeFunction {
    return this.emitter.on(event, callback)
  }

  public emit(event: string, data?: unknown) {
    getCurrentWindow().emit(`web_search://${this.window_label}`, {
      eventName: event,
      id: this.id,
      data,
    })
      .then(() => {
        console.log(`emit event: ${event} success data: `, data)
      })
      .catch((err) => {
        console.error('emit error', err)
      })
  }

  public once(event: string): Promise<unknown | undefined> {
    return this.emitter.once(event)
  }

  public off(event: string, callback: (data: unknown) => void | Promise<void>) {
    this.emitter.off(event, callback)
  }
}
