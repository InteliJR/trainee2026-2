# EcoRota

Plataforma web para organizar solicitações de coleta de materiais recicláveis em pontos geográficos predefinidos, conectando moradores e coletores por meio de um fluxo confiável e rastreável.

## Estado atual

O back-end já oferece autenticação demonstrativa, rotas do morador, agendamento, cancelamento e histórico sobre dados locais. O cliente HTTP e a sincronização com a EcoRota serão implementados por Glauco.

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
