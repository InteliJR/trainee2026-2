# EcoRota

Plataforma web para organizar solicitações de coleta de materiais recicláveis em pontos geográficos predefinidos, conectando moradores e coletores por meio de um fluxo confiável e rastreável.

## Estado atual

O projeto está na fase de definição e preparação da estrutura técnica.

Decisões estabelecidas:

- front-end em TypeScript;
- back-end em Node.js, TypeScript e Fastify;
- PostgreSQL;
- Prisma ORM 7 estável;
- Vitest;
- autenticação inicial com usuários e tokens de demonstração;
- integração EcoRota exclusivamente pelo back-end.

Decisões pendentes:

- stack complementar do front-end;
- polling, WebSocket ou estratégia híbrida;
- inclusão do painel do gestor no MVP;
- estratégia de hospedagem.

## Documentação

A documentação funcional e técnica está em [docs/projeto-ecorota.md](docs/projeto-ecorota.md).

Ela contém:

- visão geral e escopo;
- requisitos funcionais;
- regras de negócio;
- requisitos não funcionais;
- arquitetura;
- stack;
- modelagem do banco;
- integração EcoRota;
- contrato inicial da API;
- critérios de conclusão.

## Estrutura inicial

~~~text
frontend/
├── src/
│   ├── pages/
│   │   ├── morador/
│   │   ├── coletor/
│   │   └── ecorota/
│   ├── components/
│   ├── services/
│   │   └── api.ts
│   ├── styles/
│   ├── assets/
│   ├── App.tsx
│   └── main.tsx
└── package.json

backend/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── integrations/
│   │   └── ecorota.ts
│   ├── routes/
│   ├── config/
│   │   └── prisma.ts
│   ├── app.ts
│   └── server.ts
├── prisma/
│   └── schema.prisma
└── package.json
~~~

As instruções de instalação e execução serão adicionadas durante a preparação das aplicações.
