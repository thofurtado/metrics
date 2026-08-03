# Contexto de Handoff (Transição para a IDE)
**Funcionalidade:** Módulo de Cardápio Digital (White Label)

## 1. O que já foi construído e está funcionando:
- **Painel de Configurações (`/settings/cardapio`)**: 
  - Tela criada para o lojista configurar: Nome, Logo, Banner, Número de WhatsApp (para pedidos) e Status de "Aceitar Pedidos".
  - **Motor de Cores Premium:** O lojista pode escolher um tema pré-definido ou uma cor primária personalizada. Se escolher uma cor personalizada, o sistema (usando a função matemática `generatePremiumPalette` baseada em HSL) calcula fundos super requintados (pastel/creme) baseados no matiz da cor escolhida para garantir elegância e 100% de legibilidade dos textos.
- **Backend (`metrics-node`)**:
  - `PUT /settings/company-profile`: Rota para salvar a configuração (injetada no tenant correto pelo context do Prisma).
  - `GET /public/profile`: Retorna as configurações, Design Tokens e regras de funcionamento.
  - `GET /public/menu`: Busca todos os produtos ativos do banco e retorna já mapeados.
- **Cardápio Digital (`/cardapio`)**:
  - `MenuResolver.tsx`: O cérebro da rota. Injeta as cores globais (variáveis CSS) no documento. Se for a rota da Eureca, já está sendo tratada em outro lugar. Se for o Marujo, abre o legado. Caso contrário, abre o nosso novo `GenericMenu`.
  - `GenericMenu.tsx`: Layout completamente funcional. Lista os produtos agrupados por Categoria, possui um carrinho de compras completo (adicionar/remover itens, calcula o total) e finaliza o pedido enviando um resumo perfeitamente formatado direto para o WhatsApp do restaurante.

## 2. Ponto de Partida Atual:
- Toda a lógica estrutural, comunicação com banco de dados multitenant, roteamento, e injeção dinâmica de CSS estão **100% prontas e livres de erros**.
- O design já possui um comportamento "Classe A" no cálculo das cores.

## 3. Próximo Nível (O que faremos agora com as Imagens):
- Refinar visualmente os componentes do `GenericMenu.tsx` (cartões de produto, banners, cabeçalhos e checkout) com base nas referências de alta fidelidade que serão anexadas a partir de agora na IDE.

---
**Instrução para a IA da IDE:**
Por favor, leia este documento para entender a estrutura atual. O usuário fornecerá imagens de referência para elevarmos o design visual do `/cardapio` para o "próximo nível". Todo o código base (arquitetura, requests e state) já existe. Modifique primordialmente a estilização (Tailwind/CSS) de `GenericMenu.tsx` respeitando as variáveis dinâmicas de CSS (`--primary-color`, `--secondary-color`, `--background-color`).
