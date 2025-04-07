import type { EmitterEvent } from './event'
import { LazyPromise } from './lazyPromise'

enum MessageType {
  Request = 0,
  Response = 1,
  ReplyError = 2,
}

interface ProxyChannelMessage {
  req: number
  channel?: string
  methodName?: string
  args?: unknown[]
  type: MessageType
  error?: string
  result?: unknown
}

const ProxyChannelEvent = 'amiros:proxy-channel'

export class ProxyChannel {
  private readonly _proxies: Record<string, unknown> = {}
  private readonly _pendingReplies: Record<number, LazyPromise> = {}
  private _lastMsgId = 0
  constructor(private readonly emitter: EmitterEvent) {
    this.emitter.listen(ProxyChannelEvent, msg => this._receiveOneMessage(msg as ProxyChannelMessage))
  }

  public registerChannel<T>(channel: string, value: T): T {
    this._proxies[channel] = value
    return value
  }

  public getProxy<T>(channel: string): T {
    const handler = {
      get: (target: Record<PropertyKey, unknown>, name: PropertyKey) => {
        if (typeof name === 'string' && !target[name]) {
          target[name] = (...args: unknown[]) => {
            return this._remoteCall(channel, name, args)
          }
        }
        return target[name]
      },
    }
    return new Proxy(Object.create(null), handler)
  }

  private async _remoteCall(channel: string, methodName: string, args: unknown[]): Promise<unknown> {
    const callId = this._lastMsgId++
    const result = new LazyPromise()
    this._pendingReplies[callId] = result
    this._send({
      req: callId,
      channel,
      methodName,
      args,
      type: MessageType.Request,
    })
    return result
  }

  private _receiveOneMessage(data: ProxyChannelMessage): void {
    const { req, channel, methodName, args, type } = data
    switch (type) {
      case MessageType.Request: {
        const actor = this._proxies[channel!]
        if (actor) {
          const method = (actor as Record<string, unknown>)[methodName!] as unknown as (...args: unknown[]) => unknown
          if (typeof method !== 'function')
            this._replyError(req, `Unknown method ${methodName} on actor ${channel}`)
          Promise.resolve(method.apply(actor, args!)).then((result) => {
            this._send({
              req,
              type: MessageType.Response,
              result,
            })
          }).catch((error) => {
            this._replyError(req, error.message)
          })
        }
        break
      }
      case MessageType.Response: {
        const result = this._pendingReplies[req]
        result.resolveOk(data.result)
        break
      }
      case MessageType.ReplyError: {
        const result = this._pendingReplies[req]
        result.resolveErr(data.error)
        break
      }
    }
  }

  private _replyError(req: number, error: string): void {
    this.emitter.emit(ProxyChannelEvent, {
      req,
      type: MessageType.ReplyError,
      error,
    })
  }

  private _send(data: ProxyChannelMessage): void {
    this.emitter.emit(ProxyChannelEvent, data)
  }
}
