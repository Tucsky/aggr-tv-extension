// AGGR Extension Object to hold key data structures and UI elements
const AGGR_EXTENSION = {
  elements: {
    originals: { button: null },
    button: null,
    widget: null,
    iframe: null,
    container: null,
    toolbar: null,
    fallbackButton: null
  },
  resolvedSymbols: JSON.parse(localStorage.getItem('aggr_resolved_symbols') || '{}'),
  market: JSON.parse(localStorage.getItem('aggr_market') || 'null'),
  ffs: JSON.parse(localStorage.getItem('aggr_ffs') || '{}'),
  snapshot: null,
}

// Utility Functions for AGGR Extension
const utils = {
  restoreActiveItem: function () {
    const { originals, button } = AGGR_EXTENSION.elements

    if (originals.button) {
      ;[originals.button.className, button.className] = [button.className, originals.button.className]

      originals.button.click()

      originals.button = null
    }
  },
  hideActiveItem: async function () {
    const { originals, button, container, toolbar, fallbackButton } = AGGR_EXTENSION.elements
    originals.button = toolbar.querySelector('button[aria-pressed="true"]')

    if (originals.button) {
      ;[button.className, originals.button.className] = [originals.button.className, button.className]
    }

    if (originals.button !== fallbackButton) {
      fallbackButton.click()
    }

    await new Promise(resolve => setTimeout(resolve, 100))
    if (originals.button) {
      fallbackButton.className = originals.button.className
    }
    const activeWidgets = container.querySelectorAll('.widgetbar-page.active')
    for (const widget of activeWidgets) {
      widget.classList.remove('active')
    }
  },
  onToolbarItemClick: function (event) {
    if (!event.isTrusted) {
      return
    }
    
    const { widget } = AGGR_EXTENSION.elements
    if (widget.classList.contains('active')) {
      widget.classList.remove('active')
      utils.restoreActiveItem()
      if (event.currentTarget.ariaPressed === 'true') {
        event.stopPropagation()
      }
    }
  },
  onAggrButtonClick: async function () {
    const { widget, iframe, toolbar } = AGGR_EXTENSION.elements

    if (!toolbar.querySelector('button[aria-pressed="true"]')) {
      toolbar.querySelector('button').click()
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, 500)
      })

      return utils.onAggrButtonClick()
    }

    if (!AGGR_EXTENSION.elements.container.contains(AGGR_EXTENSION.elements.widget)) {
      AGGR_EXTENSION.elements.container.appendChild(AGGR_EXTENSION.elements.widget)
    }

    if (!widget.classList.contains('active')) {
      await utils.hideActiveItem()
      widget.classList.add('active')

      if (!widget.children.length) {
        console.log('Starting AGGR session...')
        widget.appendChild(iframe)
      }
    } else {
      widget.classList.remove('active')
      utils.restoreActiveItem()
    }
  },
}

// AGGR Widget and Button Injection
function createWidget() {
  const { elements } = AGGR_EXTENSION
  elements.container = document.querySelector('.widgetbar-pagescontent')
  if (!elements.container) return

  elements.iframe = document.createElement('iframe')
  elements.widget = document.createElement('div')
  Object.assign(elements.iframe, {
    width: '100%',
    height: '100%',
    border: '0',
    frameBorder: '0',
    src: 'https://tucsky.github.io/aggr',
  })
  elements.widget.className = 'widgetbar-page'
}

function injectButton(previousButton) {
  const { elements } = AGGR_EXTENSION
  elements.toolbar = document.querySelector('[data-name="right-toolbar"]')
  elements.fallbackButton = elements.toolbar.querySelector('[data-name="object_tree"]')
  elements.button = document.createElement('button')
  const { button, toolbar } = elements
  button.className = toolbar.children[toolbar.children.length - 1].className
  button.innerHTML = `
  <div class="hoverMask-I_wb5FjE"></div>
  <span role="img">
    <svg xmlns="http://www.w3.org/2000/svg" version="1.0" viewBox="0 0 700 700" style="width:2rem;height:2rem;">
      <path fill="#41a145" d="M342 1c-7.9 2.3-14.2 8.3-125.9 119.9-95.7 95.8-115.3 115.9-117.5 120.4-8 16.2.8 36.8 18.5 43.3 4 1.5 23.8 1.6 230.4 1.8 124.3 0 228-.2 230.4-.7 21.9-3.7 33.7-29.6 21.8-47.7-1.4-2-53.9-55.1-116.7-117.9C393.7 30.8 367.7 5.4 363.7 3.4 358.4.7 347.2-.6 342 1z"/>
      <path fill="#f44133" d="M122.1 414.2c-6.7 1-11.5 3.5-17 8.9-10.5 10.3-12.5 27.1-4.8 38.8 1.3 2 53.8 55 116.7 117.9 88.5 88.5 115.5 114.9 119.3 116.9 9.5 4.8 22.9 3.8 31.2-2.2 3.4-2.5 224.8-223.7 230.2-230 3.9-4.6 7.2-14.3 6.8-20-.5-6.4-1.3-9.6-2.7-11.2-.7-.9-1.2-1.8-1-2 .5-.7-3.4-5.9-6.8-9.1-3.4-3.2-10-6.8-14.4-7.9-3.3-.8-451.7-.9-457.5-.1z"/>
    </svg>
  </span>
  `
  Array.from(toolbar.children).forEach((child) => {
    if (child.tagName === 'BUTTON') {
      child.addEventListener('click', utils.onToolbarItemClick)
    }
  })
  button.addEventListener('click', utils.onAggrButtonClick)
  previousButton.insertAdjacentElement('afterend', button)
}

// TradingView Integration
function resolveSymbol(market, forceOriginal = false) {
  if (AGGR_EXTENSION.resolvedSymbols[market.id]) {
    return Promise.resolve(AGGR_EXTENSION.resolvedSymbols[market.id])
  }

  const query = {
    ...market,
  }

  if (!forceOriginal && AGGR_EXTENSION.ffs.normalizeMarkets) {
    query.exchange = 'CRYPTO'
    query.type = 'spot'
    query.quote = 'USD'
    query.local = query.local.replace(/^100+/, '').replace(/USD$/, '')
  }

  return new Promise((resolve) => {
    const type = query.type.replace('perp', 'swap')
    fetch(`https://symbol-search.tradingview.com/symbol_search/v3/?text=${query.local}&hl=1&exchange=${query.exchange}&lang=fr&search_type=crypto&domain=production&sort_by_country=US`)
    .then(res => res.json())
    .then(res => {
      const match = res.symbols.find((a) => a.currency_code === query.quote && a.type === type)
      if (match) {
        const symbol = `${match.exchange}:${match.symbol.replace(/<\/?[^>]+(>|$)/g, "")}`
        AGGR_EXTENSION.resolvedSymbols[query.id] = symbol
        localStorage.setItem('aggr_resolved_symbols', JSON.stringify(AGGR_EXTENSION.resolvedSymbols))

        resolve(symbol)
      } else {
        if (!forceOriginal) {
          resolve(resolveSymbol(market, true))
        } else {
          resolve(null)
        }
      }
    })
    .catch(err => console.error('Error:', err));
  })
}

async function setMarket(market) {
  const symbol = await resolveSymbol(market)

  TradingViewApi._activeChartWidget()
    ._model.mainSeries()
    .setSymbolParams({ symbol: symbol, currency: null, unit: null })
}

function setCrosshair(crosshair) {
  if (typeof crosshair.timestamp !== 'number' || typeof crosshair.change !== 'number') {
    return
  }
  const model = TradingViewApi._activeChartWidget()._model
  const index = model.model().timeScale().timePointToIndex(crosshair.timestamp)
  const currentPrice = parseFloat(TradingViewApi._activeChartWidget()._model.mainSeries().lastValueData().formattedPriceAbsolute.replace(/\s/g, '').replace(/,/g, '.'))
  const price = currentPrice * (1 + crosshair.change)
  const crossHairSource = model.model().crossHairSource()
  crossHairSource.setPosition(index, price, model.model().mainPane())
  TradingViewApi._activeChartWidget()._model.model().lightUpdate()
}

function listenForIncomingEvents() {
  window.addEventListener(
    'message',
    function (event) {
      if (event.data[0] !== '{' && event.data[event.data.length - 1] !== '}') {
        return
      }

      var data = JSON.parse(event.data)

      if (data.op) {
        switch (data.op) {
          case 'ready':
            if (AGGR_EXTENSION.market) {
              postMessage('market', AGGR_EXTENSION.market)
            }
            break
          case 'market':
            setMarket(data.data)
            break
          case 'crosshair':
            setCrosshair(data.data)
            break
        }
      }
    },
    false
  )
}

function postMessage(op, data) {
  if (!isIframeReady()) {
    return
  }

  AGGR_EXTENSION.elements.iframe.contentWindow.postMessage(
    JSON.stringify({
      op,
      data,
    }),
    '*'
  )
}

function listenForMarketChange() {
  const mainSerie = TradingViewApi._activeChartWidget()._model.mainSeries()
  mainSerie.symbolResolved().subscribe(null, async (symbolInfo) => {
    const { currency_code, exchange, base_currency, type, full_name } = symbolInfo

    AGGR_EXTENSION.market = { currency_code, exchange, base_currency, type, id: full_name }
    localStorage.setItem('aggr_market', JSON.stringify(AGGR_EXTENSION.market))

    postMessage('market', AGGR_EXTENSION.market)
  })
}

function isIframeReady() {
  return (
    AGGR_EXTENSION.elements.iframe &&
    AGGR_EXTENSION.elements.iframe.contentWindow &&
    AGGR_EXTENSION.elements.iframe.contentWindow.postMessage
  )
}

function listenToCrossHairChange() {
  const crossHairSource = TradingViewApi._activeChartWidget()._model.model().crossHairSource()
  crossHairSource.moved().subscribe(crossHairSource, (e) => {
    if (!isIframeReady()) {
      return
    }
    const timestamp = TradingViewApi._activeChartWidget()._model.model().timeScale().indexToTimePoint(e.index)
    const currentPrice = parseFloat(TradingViewApi._activeChartWidget()._model.mainSeries().lastValueData().formattedPriceAbsolute.replace(',', '.'))

    postMessage('crosshair', {
      timestamp,
      change: (1 - e.price / currentPrice) * -1,
    })
  })
}

// Initialization
function initializeExtension() {
  const readyStateCheckInterval = setInterval(function (time) {
    const streamsButton = document.querySelector('[data-name="union_chats"]')
    if (streamsButton) {
      clearInterval(readyStateCheckInterval)
      createWidget()
      injectButton(streamsButton)
      listenForIncomingEvents()
      listenToCrossHairChange()
      listenForMarketChange()
    }
  }, 100)
}

initializeExtension()
