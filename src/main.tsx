import 'dayjs/locale/pt-br'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import i18next from 'i18next'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { z } from 'zod'
import { zodI18nMap } from 'zod-i18n-map'
import translation from 'zod-i18n-map/locales/pt/zod.json'

import { App } from './App'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

i18next.init({
  lng: 'pt',
  debug: false,
  showSupportNotice: false,
  resources: {
    pt: { zod: translation },
  },
})
z.setErrorMap(zodI18nMap)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
