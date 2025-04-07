export class LazyPromise implements Promise<unknown> {
  private _actual: Promise<unknown> | null
  private _actualOk: ((value?: unknown) => unknown) | null
  private _actualErr: ((err?: unknown) => unknown) | null

  private _hasValue: boolean
  private _value: unknown

  protected _hasErr: boolean
  protected _err: unknown

  constructor() {
    this._actual = null
    this._actualOk = null
    this._actualErr = null
    this._hasValue = false
    this._value = null
    this._hasErr = false
    this._err = null
  }

  get [Symbol.toStringTag](): string {
    return this.toString()
  }

  private _ensureActual(): Promise<unknown> {
    if (!this._actual) {
      this._actual = new Promise<unknown>((c, e) => {
        this._actualOk = c
        this._actualErr = e

        if (this._hasValue)
          this._actualOk(this._value)

        if (this._hasErr)
          this._actualErr(this._err)
      })
    }
    return this._actual
  }

  public resolveOk(value: unknown): void {
    if (this._hasValue || this._hasErr)
      return

    this._hasValue = true
    this._value = value

    if (this._actual)
      this._actualOk!(value)
  }

  public resolveErr(err: unknown): void {
    if (this._hasValue || this._hasErr)
      return

    this._hasErr = true
    this._err = err

    if (this._actual) {
      this._actualErr!(err)
    }
    else {
      // If nobody's listening at this point, it is safe to assume they never will,
      // since resolving this promise is always "async"
    //   onUnexpectedError(err)
    }
  }

  public then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this._ensureActual().then(onfulfilled, onrejected)
  }

  public catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<unknown | TResult> {
    return this._ensureActual().catch(onrejected)
  }

  public finally(onfinally?: (() => void) | null): Promise<unknown> {
    return this._ensureActual().finally(onfinally)
  }
}
