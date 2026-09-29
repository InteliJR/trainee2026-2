# EcoRota

Aplicação local para moradores solicitarem coletas de recicláveis e coletores acompanharem e concluírem o atendimento atual. O back-end Fastify usa PostgreSQL (inclusive Supabase) e sincroniza a operação com a API EcoRota. O front-end React pode usar dados simulados para desenvolvimento.

## Estado do MVP

- Morador: login demonstrativo, pontos disponíveis, coleta imediata ou agendada, acompanhamento, cancelamento, histórico, 1 ponto por coleta concluída e badges nas metas de 1, 5 e 10 coletas.
- Coletor: atribuição atual, detalhes e confirmação do atendimento. O histórico do coletor fica para depois.
- Integração: o back-end envia solicitações e consulta o snapshot EcoRota a cada 5 segundos. A credencial fica somente no back-end.
- Fora do MVP atual: painel do gestor, resgate de recompensas e hospedagem da aplicação. A aplicação roda localmente; o banco pode ficar no Supabase.
- A rota de leitura do perfil do coletor (`GET /collectors/me`) ainda não foi implementada. A tela de perfil depende dela.

## Executar localmente

Requisitos: Node.js 22+, npm e PostgreSQL acessível. Configure `backend/.env` a partir de `backend/.env.example`, incluindo `DATABASE_URL` do Supabase ou de um PostgreSQL local. Para integração real, configure também `ECOROTA_API_TOKEN` **somente no back-end**. O `compose.yaml` oferece um Postgres local opcional.

Para conexões pelo pooler do Supabase (`*.pooler.supabase.com`), o back-end usa o certificado raiz em `backend/certs/supabase-root-2021.crt` e verifica a identidade do servidor por TLS automaticamente. Se o Supabase trocar esse certificado, baixe o novo certificado raiz nas configurações de banco do projeto e informe seu caminho em `sslrootcert` na `DATABASE_URL`.

```bash
cd backend
npm ci
npm run db:generate
npm run db:migrate
DEMO_PASSWORD='123456' npm run db:seed-demo
npm run dev
```

Os comandos acima devem ser executados dentro de `backend/` (se você estiver em `frontend/`, use `cd ../backend`). A migração deve ser aplicada ao banco configurado em `DATABASE_URL`. O seed exige `DEMO_PASSWORD` não vazia e cria `demo-resident@ecorota.local` e `demo-collector@ecorota.local` com a senha indicada. A API fica em `http://localhost:3333`; `GET /health` confirma que o servidor iniciou. Sem token EcoRota, o back-end inicia, mas não sincroniza pontos ou solicitações externas.

Em outro terminal:

```bash
cd frontend
npm ci
cp -n .env.example .env
npm run dev
```

O front-end fica em `http://localhost:5173`. Com `VITE_USE_MOCKS=true`, os painéis usam dados simulados e aceitam `demo-resident@ecorota.local` ou `demo-collector@ecorota.local` com a senha `123456`; esse modo não consulta o banco. Para testar o fluxo com o back-end e o banco, defina `VITE_USE_MOCKS=false` em `frontend/.env`, mantenha `VITE_API_URL=http://localhost:3333` e reinicie o Vite. Sem pontos sincronizados da EcoRota, o painel real do morador exibirá a lista vazia; o perfil real do coletor ainda depende de `GET /collectors/me`. O `.env.example` começa em modo mock. Não versione `.env` nem credenciais.

## Verificações

```bash
(cd backend && npm run typecheck && npm test && npm run build)
(cd frontend && npm run lint && npm test && npm run build)
```

Os testes de integração usam um PostgreSQL temporário e um gateway EcoRota simulado. Eles não alteram o banco Supabase configurado.

## Documentação

- [Escopo e contrato](docs/projeto-ecorota.md)
- [Rotas para os front-ends](docs/api-frontends.md)
- [Integração EcoRota](docs/integracao-ecorota.md)
