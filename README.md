# EcoRota

Plataforma web para organizar solicitações de coleta de materiais recicláveis em pontos geográficos predefinidos, conectando moradores e coletores por meio de um fluxo confiável e rastreável.

## Estado atual

O fluxo do morador (escolher ponto, solicitar, acompanhar, cancelar e consultar
o histórico) e a sincronização com a API EcoRota funcionam de ponta a ponta. O
coletor visualiza o atendimento atual e a conclusão está pronta no back-end,
mas duas telas do coletor ainda dependem de rotas que faltam (perfil e detalhe
do atendimento). Pontos e recompensas aguardam a regra de pontuação. O painel
da EcoRota não foi iniciado. Detalhes em
[docs/projeto-ecorota.md](docs/projeto-ecorota.md), seção 14.

Tecnologias:

- front-end: React 19, TypeScript, Vite, React Router e CSS Modules;
- back-end: Node.js 22+, TypeScript e Fastify 5;
- PostgreSQL 17 com Prisma ORM 7;
- Zod para contratos e Vitest para testes;
- autenticação inicial com contas e tokens de demonstração;
- integração EcoRota exclusivamente pelo back-end, com polling a cada 5 s.

Decisões pendentes:

- regra de pontuação;
- inclusão do painel do gestor no MVP;
- migração para JWT;
- estratégia de hospedagem.

## Documentação

A documentação funcional e técnica está em [docs/projeto-ecorota.md](docs/projeto-ecorota.md).
O guia de rotas para os dois front-ends está em [docs/api-frontends.md](docs/api-frontends.md).

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
- testes, critérios de conclusão, instruções de execução;
- limitações, hipóteses e próximos passos.

A integração com a API EcoRota está em [docs/integracao-ecorota.md](docs/integracao-ecorota.md).

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

## Executando o back-end

Requisitos: Node.js 22+, npm e Docker com Compose.

~~~bash
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up -d postgres
cd backend
npm install
npm run db:generate
npm run db:migrate
DEMO_PASSWORD='escolha-uma-senha-com-12-caracteres' npm run db:seed-demo
npm run dev
~~~

A API fica disponível em `http://localhost:3333`. Para verificar a execução, acesse
`GET /health`. As rotas de pontos leem o banco local; o seed demonstrativo cria
usuários, mas não cria pontos. Até o cliente HTTP do Glauco ser acoplado,
nenhuma chamada real à EcoRota é feita. A credencial da equipe deverá ficar
somente no back-end quando essa integração estiver pronta.

O seed cria `demo-resident@ecorota.local` e `demo-collector@ecorota.local`
com a senha definida em `DEMO_PASSWORD`. Envie e-mail e senha para
`POST /api/v1/auth/login` e use o `accessToken` como Bearer token nas demais
rotas. O processo do servidor tenta despachar coletas agendadas quando chegar
o horário. O envio efetivo depende do adaptador EcoRota a ser instalado.

Se o adaptador externo estiver ausente ou falhar depois de salvar uma
solicitação imediata, a criação retorna `integration_failed` e o servidor
tenta reenviá-la com a mesma referência. O morador consulta a coleta pelo
`id` local; o cancelamento de uma solicitação já enviada depende do adaptador.
A atualização dos estados externos também será feita pela integração do Glauco.

Comandos úteis do back-end:

~~~bash
npm run typecheck
npm test
npm run build
npm start
~~~

As variáveis são validadas na inicialização. Consulte `backend/.env.example` para a
lista completa e não versione arquivos `.env` nem credenciais reais.

## Executando o front-end

Com o back-end no ar (ou usando os dados fictícios):

~~~bash
cd frontend
cp .env.example .env
npm install
npm run dev
~~~

A aplicação abre em `http://localhost:5173`. `VITE_USE_MOCKS=true` (padrão)
usa dados em memória; entre com `resident@example.com` ou
`collector@example.com` e a senha `demo-password`. Com `VITE_USE_MOCKS=false`,
o front-end usa a API local em `VITE_API_URL` e o login é o das contas do seed.

Comandos úteis: `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.

Para ativar a integração real, preencha `ECOROTA_API_TOKEN` em `backend/.env` e
vincule o coletor demo:

~~~bash
cd backend
npm run ecorota:status
npm run ecorota:provision-collector -- demo-collector@ecorota.local
~~~