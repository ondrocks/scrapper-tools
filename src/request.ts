import requestPromise from "request-promise"
import pRetry from "p-retry"
import consoleMessage from "./consoleMessage"
import request from "request"
import debug from "debug"

let error = debug("scrapper_tools:request:error")
let warning = debug("scrapper_tools:request:warning")
let success = debug("scrapper_tools:request:success")

export default (() => {
  let proxies: Array<string> = []
  let currentIndex = 0

  let retries = 5
  let timeout = 5 * 1000
  let userAgent: string | null = null

  return {
    getOriginalRequestPromise: () => {
      return requestPromise
    },
    getOriginalRequest: () => {
      return request
    },
    setProxy: (pxy: Array<string>) => {
      success("Request Module", `Setting Proxies to`, pxy)
      currentIndex = 0
      proxies = pxy
    },

    setRetries: (t: number) => {
      success("Request Module", `Setting retries to ${t}`)
      retries = parseInt(t as any, 10)
    },

    setTimeout: (t: number) => {
      success("Request Module", `Setting Timeout to ${t}`)
      timeout = parseInt(t as any, 10) * 1000
    },

    setUserAgent: (
      value: string = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36`
    ) => {
      userAgent = value
    },

    make: async (url: string, passHeaders: any = {}, others: any = {}) => {
      let pxy: string | null = ""

      if (proxies.length === 0) {
        pxy = null
      } else {
        pxy = proxies[currentIndex++ % proxies.length]
      }

      const run = async (url: string, passHeaders: any = {}, others: any = {}) => {
        try {
          let response = await requestPromise({
            proxy: pxy,
            jar: true,
            strictSSL: false,
            uri: url,
            encoding: null,
            gzip: true,
            headers: {
              "user-agent": userAgent,
              "content-type": "application/json",
              "accept-language": "en-US,en;q=0.9",
              ...passHeaders
            },
            timeout,
            ...others
          })
          return response
        } catch (e) {
          if (e && e.statusCode && e.statusCode >= 400) {
            throw new pRetry.AbortError(e)
          }
          throw e
        }
      }

      try {
        return await pRetry(() => run(url, passHeaders, others), {
          retries,
          onFailedAttempt: (error: any) => {
            warning(
              "Request Module",
              `Attempt ${error?.attemptNumber}.${error?.retriesLeft} attempts left Proxy: ${pxy} Url: ${error?.options?.uri}. Status Code ${error.message.statusCode}`
            )
          }
        })
      } catch (e) {
        error("Request Module unrecoverable error:::", e?.statusCode)
        throw e
      }
    }
  }
})()
