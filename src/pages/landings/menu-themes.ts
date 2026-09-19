/**
 * Temas do cardápio online (white label).
 *
 * - Modo BÁSICO (padrão): nenhum tema é aplicado; o cardápio usa a cor da marca configurada e o visual claro de sempre.
 * - Modo PREMIUM: um tema completo (paleta clara ou escura + fontes), escolhido por cliente em
 *   `menuThemePreset` (e opcionalmente ajustado por `menuTheme`, um JSON parcial), guardados nas configurações do
 *   perfil (`_type: "menu_theme"` em deliverySectors) e devolvidos por GET /public/profile.
 *
 * Como funciona sem reescrever as telas: o Tailwind (tailwind.config.js) lê as escalas `slate`, `emerald` e `amber`
 * de variáveis CSS `--m-<escala>-<passo>` com o valor padrão do Tailwind como reserva. Sem tema, nada muda.
 * Com tema, este arquivo calcula as escalas a partir de poucas cores e as grava no <html>.
 * `emerald` = cor da marca no cardápio; `amber` = cor de destaque; `slate` = neutros (texto, bordas, superfícies).
 */

export type MenuThemeMode = 'light' | 'dark'

export interface MenuTheme {
  name: string
  mode: MenuThemeMode
  /** cor da marca (botões, seleção, ícones) */
  brand: string
  /** cor de destaque secundária (avisos, selos) */
  accent: string
  background: string
  surface: string
  surface2: string
  border: string
  text: string
  textMuted: string
  fonts?: { display?: string }
}

export const MENU_THEME_PRESETS: Record<string, MenuTheme> = {
  // "Haute Coastal": visual escuro (obsidiana) com dourado, fonte de títulos Playfair Display
  'haute-coastal': {
    name: 'Haute Coastal',
    mode: 'dark',
    brand: '#d97707',
    accent: '#ffb77d',
    background: '#080E18',
    surface: '#0E141E',
    surface2: '#161C26',
    border: '#242A35',
    text: '#DDE2F1',
    textMuted: '#94A3B8',
    fonts: { display: '"Playfair Display", Georgia, serif' },
  },
}

// ---------------------------------------------------------------------------------------------
// utilitários de cor
// ---------------------------------------------------------------------------------------------
type RGB = [number, number, number]

const HEX = /^#[0-9a-fA-F]{6}$/

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function mix(a: string, b: string, t: number): RGB {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return [0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t)) as RGB
}

function rgbToHex(c: RGB): string {
  return '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hexToRgb(hex)) + 0.05)
}

/** Escurece a cor até o texto branco ficar legível (contraste mínimo 4,5:1). */
function strongBrand(hex: string): string {
  let color = hex
  for (let i = 0; i < 20 && contrastWithWhite(color) < 4.5; i++) {
    color = rgbToHex(mix(color, '#000000', 0.08))
  }
  return color
}

const triplet = (c: RGB) => c.join(' ')

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

/** Escala da cor da marca/destaque para telas claras. */
function lightRamp(color: string): Record<string, RGB> {
  const strong = strongBrand(color)
  return {
    '50': mix('#ffffff', strong, 0.06),
    '100': mix('#ffffff', strong, 0.13),
    '200': mix('#ffffff', strong, 0.26),
    '300': mix('#ffffff', strong, 0.42),
    '400': mix('#ffffff', strong, 0.6),
    '500': mix('#ffffff', strong, 0.78),
    '600': mix('#ffffff', strong, 0.9),
    '700': mix(strong, '#ffffff', 0.04),
    '800': hexToRgb(strong),
    '900': mix(strong, '#000000', 0.2),
    '950': mix(strong, '#000000', 0.5),
  }
}

/**
 * Escala da cor da marca/destaque para telas escuras (tons claros viram fundos escuros, textos ficam claros).
 * Com `solidMid`, os passos 500 a 700 ficam fortes o bastante para carregar texto branco por cima (selos de aviso).
 */
function darkRamp(color: string, background: string, solidMid = false): Record<string, RGB> {
  const strong = strongBrand(color)
  if (solidMid) {
    return {
      '50': mix(background, color, 0.1),
      '100': mix(background, color, 0.17),
      '200': mix(background, color, 0.27),
      '300': mix(background, color, 0.44),
      '400': mix(color, '#ffffff', 0.05),
      '500': hexToRgb(strong),
      '600': hexToRgb(strong),
      '700': mix(strong, '#000000', 0.08),
      '800': mix(strong, '#000000', 0.16),
      '900': mix(color, '#ffffff', 0.4),
      '950': mix(color, '#ffffff', 0.65),
    }
  }
  return {
    '50': mix(background, color, 0.1),
    '100': mix(background, color, 0.17),
    '200': mix(background, color, 0.27),
    '300': mix(background, color, 0.44),
    '400': mix(color, '#ffffff', 0.1),
    '500': hexToRgb(color),
    '600': mix(strong, '#ffffff', 0.06),
    '700': mix(strong, '#ffffff', 0.1),
    '800': hexToRgb(strong),
    '900': mix(color, '#ffffff', 0.5),
    '950': mix(color, '#ffffff', 0.7),
  }
}

/** Neutros (escala `slate`) para tema escuro, derivados das cores do tema. */
function darkNeutrals(t: MenuTheme): Record<string, RGB> {
  return {
    '50': mix(t.surface, t.text, 0.04),
    '100': mix(t.surface, t.text, 0.08),
    '200': hexToRgb(t.border),
    '300': mix(t.border, t.text, 0.22),
    '400': mix(t.textMuted, t.background, 0.25),
    '500': hexToRgb(t.textMuted),
    '600': mix(t.textMuted, t.text, 0.3),
    '700': mix(t.textMuted, t.text, 0.55),
    '800': mix(t.textMuted, t.text, 0.8),
    '900': hexToRgb(t.text),
    '950': hexToRgb(t.text),
  }
}

// ---------------------------------------------------------------------------------------------
// resolução e aplicação
// ---------------------------------------------------------------------------------------------
function sanitize(theme: MenuTheme): MenuTheme | null {
  const colors: (keyof MenuTheme)[] = ['brand', 'accent', 'background', 'surface', 'surface2', 'border', 'text', 'textMuted']
  for (const key of colors) {
    if (typeof theme[key] !== 'string' || !HEX.test(theme[key] as string)) return null
  }
  if (theme.mode !== 'light' && theme.mode !== 'dark') return null
  return theme
}

/**
 * Define o tema do cardápio para um cliente.
 * Ordem: pré-visualização (?theme=nome) > preset do cliente (profile.menuThemePreset) + ajustes (profile.menuTheme).
 * Sem preset ou preset "basic": retorna null (visual padrão).
 */
export function resolveMenuTheme(profile: any): MenuTheme | null {
  let preview = ''
  try {
    preview = new URLSearchParams(window.location.search).get('theme') || ''
  } catch {
    /* sem window */
  }
  const presetName = (preview || profile?.menuThemePreset || 'basic').toString().toLowerCase()
  if (presetName === 'basic') return null

  const base = MENU_THEME_PRESETS[presetName]
  const overrides = !preview && profile?.menuTheme && typeof profile.menuTheme === 'object' ? profile.menuTheme : {}
  if (!base && !Object.keys(overrides).length) return null

  const merged = { ...(base || MENU_THEME_PRESETS['haute-coastal']), ...overrides, fonts: { ...(base?.fonts || {}), ...(overrides.fonts || {}) } }
  return sanitize(merged as MenuTheme)
}

/** Aplica o tema no <html> e devolve a função que desfaz tudo. */
export function applyMenuTheme(theme: MenuTheme): () => void {
  const root = document.documentElement
  const previousPrimary = root.style.getPropertyValue('--primary-color')
  const setVars: string[] = []
  const set = (name: string, value: string) => {
    root.style.setProperty(name, value)
    setVars.push(name)
  }

  const dark = theme.mode === 'dark'
  const brand = dark ? darkRamp(theme.brand, theme.background) : lightRamp(theme.brand)
  const accent = dark ? darkRamp(theme.accent, theme.background, true) : lightRamp(theme.accent)

  for (const step of STEPS) {
    set(`--m-emerald-${step}`, triplet(brand[step]))
    set(`--m-amber-${step}`, triplet(accent[step]))
  }
  if (dark) {
    const neutrals = darkNeutrals(theme)
    for (const step of STEPS) set(`--m-slate-${step}`, triplet(neutrals[step]))
    set('--m-bg', triplet(hexToRgb(theme.background)))
    set('--m-surface', triplet(hexToRgb(theme.surface)))
    set('--m-surface2', triplet(hexToRgb(theme.surface2)))
    set('--m-border', triplet(hexToRgb(theme.border)))
    set('--m-text', triplet(hexToRgb(theme.text)))
  }
  set('--primary-color', rgbToHex(brand['800']))
  if (theme.fonts?.display) set('--m-font-display', theme.fonts.display)

  root.classList.add('menu-themed')
  if (dark) root.classList.add('menu-dark')

  return () => {
    setVars.forEach((v) => root.style.removeProperty(v))
    if (previousPrimary) root.style.setProperty('--primary-color', previousPrimary)
    root.classList.remove('menu-themed', 'menu-dark')
  }
}
