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
