import type { SearchResult } from './types'

export enum SearchEngine {
  Sogou = 'sogou',
  Baidu = 'baidu',
  Google = 'google',
  Bing = 'bing',
  GooleScholar = 'google-scholar',
  BaiduXueshu = 'baidu-xueshu',
  DuckDuckGo = 'duckduckgo',
}

export const defaultEngines = [
  {
    id: SearchEngine.Sogou,
    name: 'sogou',
    searchUrl:
        'https://weixin.sogou.com/weixin?ie=utf8&s_from=input&_sug_=y&_sug_type_=&type=2&query={query}',
    getSearchItem: () => {
      const results: SearchResult[] = []
      const items = document.querySelectorAll('.news-list li')
      items.forEach((item, index) => {
        const titleEl = item.querySelector('h3 a')
        const linkEl = item.querySelector('h3 a') as HTMLAnchorElement
        const descEl = item.querySelector('p.txt-info')
        const faviconEl = item.querySelector('a[data-z="art"] img') as HTMLImageElement
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent!,
            url: linkEl.href,
            rank: index + 1,
            description: descEl ? descEl.textContent! : '',
            icon: faviconEl ? faviconEl.src : '',
          })
        }
      })
      return results
    },
  },
  {
    id: SearchEngine.Baidu,
    name: 'baidu',
    searchUrl: 'https://www.baidu.com/s?wd={query}',
    getSearchItem() {
      const results: SearchResult[] = []
      const items = document.querySelectorAll('#content_left .result')
      items.forEach((item, index) => {
        const titleEl = item.querySelector('.t')
        const linkEl = item.querySelector('a')
        const descEl = item.querySelector('.c-abstract')
        const faviconEl = item.querySelector('.c-img')
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent!,
            url: linkEl.href,
            rank: index + 1,
            description: descEl ? descEl.textContent! : '',
            icon: faviconEl ? faviconEl.getAttribute('src')! : '',
          })
        }
      })
      return results
    },
  },
  {
    id: SearchEngine.Google,
    name: 'google',
    searchUrl: 'https://www.google.com/search?q={query}',
    getSearchItem() {
      const results: SearchResult[] = []
      const items = document.querySelectorAll('#search .MjjYud')
      items.forEach((item, index) => {
        const titleEl = item.querySelector('h3')
        const linkEl = item.querySelector('a')
        const descEl = item.querySelector('.VwiC3b')
        const faviconEl = item.querySelector('img.XNo5Ab') as HTMLImageElement
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent!,
            url: linkEl.href,
            rank: index + 1,
            description: descEl ? descEl.textContent! : '',
            icon: faviconEl ? faviconEl.src : '',
          })
        }
      })
      return results
    },
  },
  {
    id: SearchEngine.Bing,
    name: 'bing',
    searchUrl: 'https://www.bing.com/search?q={query}',
    getSearchItem() {
      const results: SearchResult[] = []
      const items = document.querySelectorAll('#b_content .b_algo')
      items.forEach((item, index) => {
        const titleEl = item.querySelector('h2 a')
        const linkEl = item.querySelector('h2 a') as HTMLAnchorElement
        const descEl = item.querySelector('.b_caption p')
        const faviconEl = item.querySelector('.wr_fav img') as HTMLImageElement
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent!,
            url: linkEl.href,
            rank: index + 1,
            description: descEl ? descEl.textContent! : '',
            icon: faviconEl?.src ? faviconEl.src : '',
          })
        }
      })
      return results
    },
  },
  {
    id: SearchEngine.GooleScholar,
    name: 'google-scholar',
    searchUrl: 'https://scholar.google.com/scholar?q={query}',
    getSearchItem() {
      const results: SearchResult[] = []
      const items = document.querySelectorAll('.gs_r')
      items.forEach((item, index) => {
        const titleEl = item.querySelector('.gs_rt')
        const linkEl = item.querySelector('.gs_rt a') as HTMLAnchorElement
        const descEl = item.querySelector('.gs_rs')
        const faviconEl = item.querySelector('.gs_rt img') as HTMLImageElement
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent!,
            url: linkEl.href,
            rank: index + 1,
            description: descEl ? descEl.textContent! : '',
            icon: faviconEl ? faviconEl.src : '',
          })
        }
      })
      return results
    },
  },
  {
    id: SearchEngine.BaiduXueshu,
    name: 'baidu-xueshu',
    searchUrl: 'https://xueshu.baidu.com/s?wd={query}',
    getSearchItem() {
      const results: SearchResult[] = []
      const items = document.querySelectorAll('#bdxs_result_lists .sc_default_result')
      items.forEach((item, index) => {
        const titleEl = item.querySelector('.sc_content .t')
        const linkEl = item.querySelector('.sc_content a') as HTMLAnchorElement
        const descEl = item.querySelector('.c_abstract')
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent!.trim(),
            url: linkEl.href,
            rank: index + 1,
            description: descEl ? descEl.textContent!.trim() : '',
            icon: '',
          })
        }
      })
      return results
    },
  },
  {
    id: SearchEngine.DuckDuckGo,
    name: 'duckduckgo',
    searchUrl: 'https://duckduckgo.com/search?q={query}',
    getSearchItem() {
      const results: SearchResult[] = []
      const items = document.querySelectorAll('article.yQDlj3B5DI5YO8c8Ulio')
      items.forEach((item, index) => {
        const titleEl = item.querySelector('.EKtkFWMYpwzMKOYr0GYm.LQVY1Jpkk8nyJ6HBWKAk')
        const linkEl = item.querySelector('a')
        const descEl = item.querySelector('.E2eLOJr8HctVnDOTM8fs')
        const icon = item.querySelector('.DpVR46dTZaePK29PDkz8 img')
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent!,
            url: linkEl.href,
            rank: index + 1,
            description: descEl ? descEl.textContent! : '',
            icon: icon ? (icon as HTMLImageElement).src : '',
          })
        }
      })
      return results
    },
  },
]
