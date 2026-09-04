# Regras de Edição de Código

- **Preservação de Código:** NUNCA remova partes do código, declarações de variáveis, schemas do Zod (como `const formSchema = z.object(...)`), ou blocos inteiros que não estão diretamente relacionados com a tarefa atual.
- **Edições Cirúrgicas:** Quando fizer alterações em arquivos existentes, modifique apenas as linhas estritamente necessárias. Preserve as estruturas ao redor.
- **Verificação Pós-Edição:** Sempre verifique se chaves `{}`, parênteses `()` e declarações fundamentais não foram apagadas acidentalmente durante uma refatoração ou inserção.

# Distribuição de Aplicativos e Central de Downloads

- **GitHub Privado:** Os repositórios da Metrics no GitHub são privados. Links de download públicos NUNCA devem apontar diretamente para releases ou assets do GitHub (pois dão erro de autenticação/404 para usuários).
- **Três Aplicativos Oficiais em Produção:**
  1. **Metrics Windy** (Agente de Telemetria & Suporte): distribuído via API Fastify (`https://api.metrics.dev.br/api/public/windy/download`) e Cloudflare R2 (`https://pub-92bef1bd95274c4885abde2bc51eadfb.r2.dev/Windy.exe`).
  2. **Metrics Ponto** (Ponto Eletrônico & Gestão RH): distribuído via Cloudflare R2 (`https://pub-92bef1bd95274c4885abde2bc51eadfb.r2.dev/Metrics%20Setup%200.0.0.exe`).
  3. **Metrics Mobile** (Comanda & Atendimento Móvel): distribuído via Cloudflare R2 (`https://pub-92bef1bd95274c4885abde2bc51eadfb.r2.dev/metrics-mobile.apk`).

# Metrics UI Core & Design System (Densidade, Layout e Responsividade)

## 1. Identidade Visual (Metrics Soft UI)
- **Não usar Neomorfismo puro:** Em interfaces operacionais e dashboards do Metrics, o neomorfismo puro é proibido devido à falta de contraste em monitores TN antigos e perda drástica de densidade de informação.
- **Padrão Oficial (Soft Clean SaaS):** Estilo limpo de alta precisão (inspirado em Linear/Stripe):
  - Fundo neutro: `bg-slate-50/50` (dark: `bg-slate-950`).
  - Bordas sutis de alta definição: `border border-slate-200/80 dark:border-slate-800`.
  - Elevações mínimas: `shadow-xs` ou `shadow-sm`.
  - Tipografia: Manrope com números tabulares (`tabular-nums`) para moedas, estoques e IDs.

## 2. Escala Universal e Responsividade (1024x768 até 1080p a 125%)
- **Unidades:** Todas as medidas de espaçamento, padding e tipografia devem utilizar `rem` para respeitar a escala de fonte raiz.
- **Escala de Fonte Raiz (`src/index.css`):**
  - Desktop Padrão (1920x1080 100%): `html { font-size: 14px; }` (padrão SaaS, não 16px de landing page).
  - Escala 125%, Notebooks (1366x768) ou telas baixas: `@media (max-width: 1440px), (max-height: 850px) { html { font-size: 12.5px; } }` (reduz ~12% proporcionalmente).
  - Monitores PDV e clientes antigos (1024x768): `@media (max-width: 1080px), (max-height: 768px) { html { font-size: 11.5px; } }`.

## 3. Regras de Estrutura, Densidade e Cabeçalhos
- **Layout Wrapper Global (`_layouts/app.tsx`):** Proibido usar `lg:p-14` ou `p-10`. O espaçamento máximo permitido é `p-3 md:p-5 lg:p-6`.
- **PageHeader Unificado:**
  - O título nunca deve ultrapassar `text-xl md:text-2xl font-black tracking-tight` (nunca usar `text-5xl`).
  - Subtítulos longos são proibidos em telas de rotina; usar texto sutil inline (`text-xs text-muted-foreground`) ou omitir.
  - Ações primárias e botões de filtro devem ficar na mesma linha horizontal do título sempre que possível. Altura máxima do cabeçalho: 44px a 50px.
- **Tabelas de Alta Densidade (High-Density Tables):**
  - Células (`TableCell`) devem usar no máximo `py-2.5` a `py-3` (altura final da linha entre 40px e 44px, nunca `py-5`).
  - Badges compactos (`h-5 px-2 text-[10px] font-bold rounded-md`).
  - Valores numéricos sempre alinhados à direita com `tabular-nums`.
- **Modais e Diálogos:** Altura máxima controlada (`max-h-[85vh]`), cabeçalho e rodapé de ações fixos, corpo com scroll interno (`overflow-y-auto`).
- **Mobile (< 768px):** Proibido tabelas com rolagem horizontal infinita sem tratamento. Tabelas devem colapsar automaticamente em Cards de Lista (List View) de 2 a 3 linhas por item (`Nome + Valor` na linha 1; `Badge/Categoria + Ações` na linha 2).
