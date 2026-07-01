# Regras de Edição de Código

- **Preservação de Código:** NUNCA remova partes do código, declarações de variáveis, schemas do Zod (como `const formSchema = z.object(...)`), ou blocos inteiros que não estão diretamente relacionados com a tarefa atual.
- **Edições Cirúrgicas:** Quando fizer alterações em arquivos existentes, modifique apenas as linhas estritamente necessárias. Preserve as estruturas ao redor.
- **Verificação Pós-Edição:** Sempre verifique se chaves `{}`, parênteses `()` e declarações fundamentais não foram apagadas acidentalmente durante uma refatoração ou inserção.
