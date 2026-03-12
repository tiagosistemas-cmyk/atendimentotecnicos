# ATTEC Operacional

Sistema web para distribuição de pedidos por técnico, com visão base operacional + kanban, marcação automática de **feito em**, importação/exportação Excel e layout pronto para deploy na Vercel.

## O que este projeto faz

- Importa sua planilha `.xlsx`, `.xls` ou `.csv`
- Lê colunas como:
  - DATA DE EMISSÃO
  - PROPRIETÁRIO
  - NUMERO DO PEDIDO
  - NOME DO CLIENTE
  - STATUS
  - TIPO
  - PAGAMENTO
  - PEÇA JÁ RETIRADA NO ATO DA COMPRA?
  - TÉCNICO
  - FEITO EM
- Permite definir o técnico por pedido
- Mostra agenda visual em colunas por técnico
- Permite trocar pedidos entre técnicos por drag and drop
- Ao clicar em **Feito**, grava automaticamente data e hora
- Exporta novamente para Excel
- Salva os dados no navegador com `localStorage`

## Instalação local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Deploy na Vercel

A Vercel detecta automaticamente projetos Next.js e permite deploy via Git ou CLI. A documentação oficial também informa que o CLI pode ser instalado com `pnpm i -g vercel`, e que o deploy pode ser feito com `vercel` na raiz do projeto. citeturn247338search1turn247338search6turn247338search8

### Opção 1 — GitHub + Vercel

1. Envie esta pasta para um repositório no GitHub
2. Entre na Vercel
3. Clique em **Add New Project**
4. Importe o repositório
5. Clique em **Deploy**

A Vercel faz deploy automático a cada push no branch principal e cria previews para alterações em branches e PRs. citeturn247338search9

### Opção 2 — CLI da Vercel

```bash
npm install
npx vercel
```

Para produção:

```bash
npx vercel --prod
```

## Observação importante

Esta versão é **frontend-first** e usa persistência local no navegador. Ela já é ótima para operação diária em um único computador ou equipe pequena usando uma mesma máquina.

Se você quiser a próxima evolução, o ideal é conectar:

- Supabase / PostgreSQL
- login por usuário
- histórico de movimentações
- sincronização entre vários computadores
- impressão e relatórios avançados

## Estrutura do projeto

- `app/page.tsx`: página principal
- `components/OperationalApp.tsx`: lógica do sistema
- `app/globals.css`: layout visual

