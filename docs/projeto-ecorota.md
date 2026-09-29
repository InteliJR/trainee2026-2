# EcoRota - Documentação do projeto

## 1. Visão geral

A EcoRota é uma plataforma web para organizar solicitações de coleta de materiais recicláveis em pontos geográficos predefinidos. O produto conecta moradores e coletores, substituindo uma operação baseada em grupos de WhatsApp, indicações e planilhas por um fluxo estruturado, rastreável e confiável.

O valor central do produto não é apenas mostrar localizações. A plataforma deve oferecer:

- previsibilidade ao morador;
- organização operacional ao coletor;
- histórico confiável das coletas;
- reconhecimento pelo comportamento de reciclar;
- visibilidade da operação para a EcoRota.

O fluxo principal é:

~~~text
Morador seleciona um ponto
    -> solicita uma coleta
    -> EcoRota atribui um coletor
    -> coletor realiza o atendimento
    -> morador acompanha a conclusão
    -> sistema concede o reconhecimento
~~~

### 1.1 Objetivo

Entregar uma aplicação web funcional que permita:

- ao morador solicitar, acompanhar e consultar coletas;
- ao coletor organizar e concluir atendimentos;
- à aplicação integrar a experiência do produto à operação simulada pela API EcoRota.

### 1.2 Perfis

#### Morador

Seleciona um ponto, informa os dados do material, solicita a coleta, acompanha o status, consulta o histórico e recebe reconhecimento.

#### Coletor

Controla sua disponibilidade, visualiza atendimentos atribuídos, consulta detalhes e confirma a coleta. O coletor não pode cancelar uma solicitação.

#### Gestor

Pode acompanhar indicadores e o estado geral da operação. A inclusão desse perfil no MVP ainda não foi decidida.

## 2. Escopo

### 2.1 Escopo confirmado

- Aplicação web para moradores e coletores.
- Seleção direta de um ponto de coleta pelo morador.
- Registro de material, quantidade aproximada, data desejada e observações.
- Criação e acompanhamento de uma solicitação.
- Cancelamento quando permitido.
- Histórico do morador.
- Mecanismo de pontos ou reconhecimento.
- Controle de disponibilidade do coletor custom.
- Visualização e conclusão de atendimentos pelo coletor.
- Integração com a EcoRota exclusivamente pelo back-end da equipe.

### 2.2 Decisões pendentes

- ~~Polling, WebSocket ou estratégia híbrida.~~ Decidido: polling do snapshot (ver `docs/integracao-ecorota.md`).
- ~~Uso de mapa ou somente lista para seleção dos pontos.~~ Decidido: lista, com as coordenadas exibidas em cada cartão (sem mapa).
- Inclusão do painel do gestor no MVP. Até agora não foi implementado: `frontend/src/pages/ecorota/` está vazio.
- Regra de pontuação (quantos pontos cada coleta concede) e rotas de recompensas.
- Evolução do modo de demonstração para JWT real após o MVP.
- Estratégia de hospedagem.

### 2.3 Fora do escopo inicial

- Algoritmo próprio de atribuição de coletores.
- Otimização própria de rotas.
- Cadastro público de usuários.
- Recuperação e troca de senha.
- Confirmação de e-mail.
- Login social.
- Sistema avançado de recompensas.
- Aplicativo móvel nativo.

## 3. Requisitos funcionais

Situação verificada no código em 28/09/2026. **Implementado** significa que o
fluxo funciona de ponta a ponta com o back-end real; **Parcial** indica que há
lacuna descrita na coluna de observações.

| ID | Requisito | Perfil | Situação | Observações |
| --- | --- | --- | --- | --- |
| RF01 | Login por e-mail e senha, com redirecionamento ao início do perfil | Ambos | Implementado | Contas demo criadas pelo seed; token guardado em `sessionStorage` |
| RF02 | Listar os pontos de coleta da região | Morador | Implementado | Lista com nome, tipo e coordenadas; sem mapa |
| RF03 | Solicitar coleta: ponto, materiais (tipo, quantidade, unidade), data e observações | Morador | Implementado | A tela exige data e hora futuras; a API também aceita envio imediato (sem `scheduledAt`) |
| RF04 | Acompanhar o status da coleta | Morador | Implementado | Consulta a cada 15 s na tela; para ao chegar a estado final |
| RF05 | Cancelar uma coleta | Morador | Implementado | Bloqueado a partir de `in_service` (409) |
| RF06 | Consultar o histórico com filtro por status e paginação por cursor | Morador | Implementado | Mostra os pontos ganhos quando existirem |
| RF07 | Informar disponibilidade | Coletor | Parcial | Rota do back-end pronta; a tela de perfil chama `GET /collectors/me`, que ainda não existe (ver seção 13) |
| RF08 | Ver o atendimento atual | Coletor | Implementado | `GET /collectors/me/assignment`, consulta a cada 15 s |
| RF09 | Ver detalhes e concluir o atendimento | Coletor | Parcial | A conclusão existe no back-end; a tela de detalhe usa `GET /collections/:id`, que hoje é exclusiva do morador (ver seção 13) |
| RF10 | Reconhecimento por coleta concluída | Morador | Parcial | Crédito único por coleta garantido no banco; regra de pontuação e rotas `/rewards` pendentes |
| RF11 | Painel de acompanhamento da operação | EcoRota | Não iniciado | Decisão sobre o MVP pendente |

## 4. Regras de negócio

**Coleta**

- Cada coleta pertence a um morador e a um ponto de coleta existente.
- Precisa de ao menos um material; toda quantidade é positiva. `kg` aceita até
  três casas decimais; `units` e `bags` exigem inteiro. `other` exige descrição
  (até 120 caracteres). Observações têm até 500 caracteres.
- Com `scheduledAt` futuro, a coleta fica `scheduled` e só é enviada à EcoRota
  no horário. Sem data, é enviada na hora. A EcoRota não tem agendamento
  próprio.
- Para mudar a data, o morador cancela e cria outra coleta.
- Se o envio falhar, a coleta fica `integration_failed` e o servidor tenta de
  novo a cada minuto com a mesma referência (`collection:<id-local>`), sem
  duplicar o pedido.

**Ciclo de vida**

~~~text
scheduled -> pending -> assigned -> in_service -> completed
   |            |           |
   +------------+-----------+--> cancelled   (só antes de in_service)

integration_failed -> reenviada automaticamente -> pending
~~~

- Só o morador proprietário cancela; o coletor não cancela solicitações.
- Só o coletor atribuído conclui, e só depois de chegar ao ponto. Antes disso,
  a EcoRota recusa e a API responde 409 `COLLECTION_NOT_COMPLETABLE`.
- O coletor recebe apenas `id` e nome do morador; identificadores externos
  nunca aparecem nas respostas.

**Coletores**

- Cada usuário coletor tem no máximo um coletor custom na EcoRota, cadastrado
  ou vinculado por script.
- O coletor custom começa indisponível. Indisponível, ele não recebe pedidos
  novos, mas precisa concluir os que já tem.
- Os coletores `system` atendem sozinhos; a coleta atribuída a eles aparece com
  `collector: null`.

**Reconhecimento**

- Uma coleta concluída gera no máximo um crédito, garantido por transação e por
  restrição única (`collectionId` + `reason`).
- A quantidade de pontos ainda não foi definida.

**Acesso**

- Rotas de morador e de coletor validam o perfil (403 se incompatível).
- Um morador só enxerga as próprias coletas (404 para as de outros).

## 5. Requisitos não funcionais

| Tema | Como está atendido |
| --- | --- |
| Segurança de credenciais | O token da EcoRota fica só em `backend/.env` e é lido apenas por `EcoRotaHttpClient`; nunca chega ao front-end, aos logs ou às mensagens de erro |
| Autenticação | Senhas com `scrypt` e sal; tokens aleatórios guardados como hash SHA-256; login com custo constante mesmo para e-mail inexistente |
| Validação | Schemas Zod em `backend/src/contracts`; variáveis de ambiente validadas na inicialização |
| Resiliência | Timeout (5 s), até 3 tentativas com espera em chamadas idempotentes, tratamento de 429 com `Retry-After`; falhas viram 503 `ECOROTA_UNAVAILABLE` |
| Consistência | Envio idempotente por referência, bloqueio de despacho de 60 s, escritas condicionadas ao status lido e crédito único por coleta |
| Observabilidade | Log estruturado do Fastify e `requestId` em toda resposta de erro (também no header `x-request-id`) |
| Desempenho | Sincronização de 12 chamadas por minuto (limite da EcoRota: 300); histórico paginado por cursor |
| Manutenção | Front e back em TypeScript, camadas separadas, contratos versionados em `/api/v1` |
| Experiência | Estados de carregamento, vazio e erro nas telas; mensagens de erro em português; tela do coletor e do morador com o mesmo conjunto de componentes |
| Portabilidade | Banco em contêiner (`compose.yaml`), configuração por variáveis de ambiente |

## 6. Arquitetura

### 6.1 Estilo arquitetural

O front-end e o back-end serão mantidos no mesmo repositório. O back-end utilizará uma arquitetura em camadas simples, familiar à equipe:

~~~text
Aplicação web
      |
      v
API Fastify
      |
      +--> controllers --> services --> Prisma --> PostgreSQL
      |
      +--> integração EcoRota --> API EcoRota
~~~

### 6.2 Camadas

#### Routes

Registram URLs, métodos e mecanismos de autenticação.

#### Controllers

Recebem a requisição, chamam serviços e produzem a resposta HTTP. Não contêm regras de negócio.

#### Services

Contêm regras, verificações de estado e coordenação entre banco e integrações.

#### Config

Centraliza a configuração do Prisma e de outras dependências técnicas do back-end.

#### Integrations

Encapsula a comunicação com a API EcoRota para que controllers e páginas não dependam diretamente do serviço externo.

### 6.3 Autenticação substituível

O sistema começará com AUTH_MODE=mock e tokens de demonstração reconhecidos pelo back-end. O contrato será compatível com JWT:

~~~text
POST /auth/login
Authorization: Bearer <token>
~~~

Controllers e services utilizarão somente o usuário autenticado presente na requisição.

### 6.4 Sincronização substituível

A sincronização ficará atrás de uma abstração. Polling, WebSocket ou estratégia híbrida não devem alterar controllers, regras ou componentes visuais.

### 6.5 Estrutura inicial

~~~text
trainee2026-2/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── morador/
│   │   │   ├── coletor/
│   │   │   └── ecorota/
│   │   ├── components/
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── styles/
│   │   ├── assets/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── integrations/
│   │   │   └── ecorota.ts
│   │   ├── routes/
│   │   ├── config/
│   │   │   └── prisma.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── docs/
│   └── projeto-ecorota.md
├── compose.yaml
├── .env.example
└── README.md
~~~

## 7. Stack

| Camada | Tecnologia | Situação |
| --- | --- | --- |
| Front-end | React 19 | Em uso |
| Linguagem do front-end | TypeScript | Em uso |
| Build do front-end | Vite | Em uso |
| Roteamento | React Router 7 | Em uso |
| Estilos | CSS Modules, componentes próprios em `components/ui` | Em uso |
| Estado remoto | Hook próprio `useLiveResource` com polling (sem TanStack Query) | Em uso |
| Testes e qualidade do front-end | Vitest, Testing Library, ESLint, Prettier | Em uso |
| Back-end | Node.js 22+ com Fastify 5 | Em uso |
| Linguagem do back-end | TypeScript | Em uso |
| Validação | Zod (back-end); o front-end usa tipos próprios, sem Zod | Parcial |
| Banco de dados | PostgreSQL 17 (Docker Compose) | Em uso |
| ORM | Prisma ORM 7 com `@prisma/adapter-pg` | Em uso |
| Testes do back-end | Vitest, com `embedded-postgres` nos testes de integração | Em uso |
| Autenticação inicial | Sessões com token opaco (`AUTH_MODE=mock`) | Em uso |
| Autenticação posterior | JWT (`AUTH_MODE=jwt` ainda lança erro na inicialização) | Não implementado |
| Sincronização | Polling de `GET /v1/snapshot` a cada 5 s | Em uso |

## 8. Modelagem do banco de dados

O schema Prisma em `backend/prisma/schema.prisma` contém usuários (com perfil
`resident` ou `collector`), sessões de autenticação, coletores customizados,
pontos da EcoRota, coletas, materiais, recompensas e movimentações de pontos.
A migração inicial está em `backend/prisma/migrations`.

Cada coleta pertence a um morador e a um ponto; materiais são linhas separadas
com tipo, quantidade e unidade. `externalReference` é única e derivada do UUID
local. `ecorotaRequestId` guarda o vínculo com a solicitação externa. O
histórico é consultado por morador, ordenado por criação e paginado por cursor.
A tabela de movimentações possui restrição única por coleta e motivo. O serviço
de crédito usa uma transação e essa restrição para registrar, no máximo uma
vez, os pontos de cada coleta concluída; a quantidade de pontos permanece
indefinida até a decisão da tarefa 14.

## 9. Integração EcoRota

`EcoRotaGateway` define as operações usadas da API EcoRota. `EcoRotaHttpClient`
implementa essa interface com a credencial da equipe, que fica só no back-end.
Sem `ECOROTA_API_TOKEN`, um adaptador temporário responde 503. Os pontos
exibidos pelas rotas do morador são lidos do banco local, preenchido pela
sincronização. Detalhes, regras, erros e limitações estão em
`docs/integracao-ecorota.md`.

A criação salva a coleta e os materiais antes de chamar o gateway. Quando
`scheduledAt` é futuro, o processo do servidor tenta enviar a solicitação
somente após esse horário. Cada tentativa usa `collection:<id-local>` como
referência estável. O serviço grava o `ecorotaRequestId` retornado pelo
gateway e mantém falhas locais para nova tentativa. Se o envio anterior tiver
resultado incerto, a sincronização usa a mesma referência para religar a
solicitação existente, sem reenviá-la.

Consulta e histórico do morador usam o estado local. Mudanças na EcoRota, como
atribuição e conclusão, chegam por polling de `GET /v1/snapshot` a cada 5 s. A
proteção contra créditos duplicados já existe, mas o cálculo e o disparo da
pontuação aguardam a decisão da tarefa 14.

## 10. Contrato da API interna

Os schemas Zod em `backend/src/contracts` são a fonte executável deste contrato.
O guia operacional para ambos os front-ends está em `docs/api-frontends.md`.

### 10.1 Convenções

- Prefixo: `/api/v1`; `GET /health` permanece público e sem versão.
- JSON em `camelCase`, UUIDs e datas ISO 8601 com fuso explícito.
- Autenticação por `Authorization: Bearer <token>`.
- Resposta individual: `{ "data": ... }`.
- Lista paginada: `{ "data": [...], "nextCursor": "cursor-ou-null" }`.
- `limit` usa 20 por padrão, aceita de 1 a 100 e o cursor tem até 200 caracteres.

### 10.2 Rotas

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | Público | Login demo por e-mail e senha |
| GET | `/api/v1/auth/me` | Autenticado | Usuário atual |
| GET | `/api/v1/collection-points` | Autenticado | Lista pontos de coleta |
| GET | `/api/v1/collection-points/:id` | Autenticado | Detalha um ponto |
| POST | `/api/v1/collections` | Morador | Cria coleta imediata ou agendada |
| GET | `/api/v1/collections` | Morador | Histórico próprio com cursor |
| GET | `/api/v1/collections/:id` | Morador proprietário; coletor pendente | Detalha coleta própria |
| POST | `/api/v1/collections/:id/cancel` | Morador proprietário | Cancela antes de `in_service` |
| PATCH | `/api/v1/collectors/me/availability` | Coletor | Altera disponibilidade |
| GET | `/api/v1/collectors/me/assignment` | Coletor | Coleta atribuída ou `data: null` |
| POST | `/api/v1/collections/:id/complete` | Coletor atribuído | Confirma coleta em `in_service` |
| GET | `/api/v1/rewards/balance` | Morador | Saldo de pontos |
| GET | `/api/v1/rewards/transactions` | Morador | Extrato com cursor |

As rotas de recompensas nesta tabela ainda são contratos planejados, não rotas
disponíveis; `GET /collections/:id` segue exclusivo do morador. Criação retorna HTTP 201; outras operações implementadas
retornam HTTP 200. Cancelamento devolve a coleta atualizada.

### 10.3 Autenticação

O login recebe contas pré-cadastradas:

~~~json
{
  "email": "resident@example.com",
  "password": "demo-password"
}
~~~

A resposta contém `accessToken`, `tokenType: "Bearer"` e o usuário com
`id`, `name`, `email` e perfil `resident` ou `collector`. O MVP usa
tokens demonstrativos mantendo o mesmo header esperado por uma futura versão JWT.

### 10.4 Coletas e materiais

Materiais: `paper`, `plastic`, `glass`, `metal`, `electronics` e
`other`. Unidades: `kg`, `units` e `bags`.

- Deve existir ao menos um material e toda quantidade deve ser positiva.
- `kg` aceita decimal; `units` e `bags` exigem inteiro.
- `other` exige descrição de até 120 caracteres.
- Observações aceitam até 500 caracteres.

~~~json
{
  "collectionPointId": "7f5b0932-51de-4b93-8526-4fdcb0d56fb8",
  "materials": [
    { "type": "paper", "quantity": 2.5, "unit": "kg" },
    {
      "type": "other",
      "quantity": 1,
      "unit": "units",
      "description": "Bateria automotiva"
    }
  ],
  "scheduledAt": "2026-09-26T15:00:00.000Z",
  "notes": "Retirar na portaria"
}
~~~

Sem `scheduledAt`, a solicitação é enviada imediatamente. Com data futura, fica
`scheduled` localmente e só é enviada à EcoRota no horário previsto. Se o
envio imediato falhar, a API devolve HTTP 201 com estado `integration_failed`
e mantém os dados locais para nova tentativa. Para mudar a data no MVP, o
morador cancela e cria outra coleta.

Estados públicos:

~~~text
scheduled
pending
assigned
in_service
completed
cancelled
integration_failed
~~~

O front-end usa somente o `id` local. `externalReference` e
`ecorotaRequestId` são internos. O coletor recebe apenas `id` e `name` do
morador.

### 10.5 Erros

~~~json
{
  "code": "COLLECTION_NOT_CANCELLABLE",
  "message": "Esta coleta não pode mais ser cancelada.",
  "details": { "status": "in_service" },
  "requestId": "req-123"
}
~~~

O mesmo `requestId` é enviado no header `x-request-id`. Falhas inesperadas são
registradas internamente sem expor detalhes técnicos ao cliente.

| HTTP | Uso |
| --- | --- |
| 400 | Corpo, parâmetros ou agendamento inválidos |
| 401 | Token ausente ou inválido |
| 403 | Perfil ou propriedade incompatível |
| 404 | Rota ou recurso inexistente |
| 409 | Estado impede cancelamento ou conclusão |
| 503 | EcoRota indisponível |
| 500 | Erro interno inesperado |

Códigos estáveis: `VALIDATION_ERROR`, `INVALID_SCHEDULE`, `UNAUTHORIZED`,
`FORBIDDEN`, `RESOURCE_NOT_FOUND`, `COLLECTION_NOT_CANCELLABLE`,
`COLLECTION_NOT_COMPLETABLE`, `NO_ACTIVE_ASSIGNMENT`, `ECOROTA_UNAVAILABLE`
e `INTERNAL_ERROR`.

## 11. Testes

| Local | O que cobre | Resultado em 28/09/2026 |
| --- | --- | --- |
| `frontend/` (Vitest + Testing Library) | Login e proteção de rotas, lista de pontos, formulário de coleta, acompanhamento, histórico, tela do coletor, conclusão, cliente HTTP, mensagens de erro, hook de polling | 15 arquivos, 62 testes passando; `typecheck` e `lint` sem erros |
| `backend/` (Vitest) | Variáveis de ambiente, contratos Zod, tratamento de erros, cliente HTTP da EcoRota (timeout, retentativa, 429, resposta inválida), rotas de ponta a ponta contra Postgres embutido e EcoRota simulada (`fake-ecorota.ts`) | 27 testes de unidade passando; os 3 arquivos de integração dependem de baixar o motor do Prisma e não puderam ser executados no ambiente usado para escrever este documento |

Além dos testes automatizados, a integração com a API real foi validada
manualmente em 28/09/2026 (tabela em `docs/integracao-ecorota.md`).

Como rodar:

~~~bash
cd backend && npm run typecheck && npm test
cd frontend && npm run typecheck && npm run lint && npm test
~~~

Não há teste automatizado de ponta a ponta no navegador.

## 12. Critério de conclusão do MVP

O fluxo principal estará concluído quando for possível:

1. acessar a aplicação como morador;
2. selecionar um ponto;
3. criar uma solicitação;
4. acompanhar a atribuição do coletor;
5. acessar a aplicação como coletor;
6. visualizar o atendimento;
7. concluir como coletor ou cancelar como morador conforme as regras;
8. retornar ao perfil do morador;
9. visualizar a coleta no histórico;
10. visualizar o reconhecimento concedido uma única vez.

## 13. Como executar

Requisitos: Node.js 22+, npm e Docker com Compose. O passo a passo do
back-end está no `README.md`. Para subir o sistema completo:

~~~bash
# 1. Banco e back-end
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up -d postgres
cd backend
npm install
npm run db:generate
npm run db:migrate
DEMO_PASSWORD='senha-com-12-ou-mais-caracteres' npm run db:seed-demo
npm run dev            # http://localhost:3333

# 2. Front-end (outro terminal)
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
~~~

Dois modos de uso do front-end, controlados por `VITE_USE_MOCKS`:

| Modo | Configuração | Comportamento |
| --- | --- | --- |
| Demonstração isolada | `VITE_USE_MOCKS=true` (padrão) | Dados fictícios em memória, sem back-end. Login: `resident@example.com` ou `collector@example.com`, senha `demo-password` |
| Integrado | `VITE_USE_MOCKS=false` | Usa a API local. Login com as contas do seed: `demo-resident@ecorota.local` e `demo-collector@ecorota.local`, senha definida em `DEMO_PASSWORD` |

Para o modo integrado com a EcoRota real:

1. Preencha `ECOROTA_API_TOKEN` em `backend/.env` (sem ele, a sincronização
   fica desligada e a lista de pontos vem vazia).
2. Confira o ambiente com `npm run ecorota:status`.
3. Vincule o coletor demo: `npm run ecorota:provision-collector -- demo-collector@ecorota.local`
   (ou `--link <id-ecorota>` se o coletor custom já existir; o limite é de dois
   customs por ambiente).
4. Entre como coletor e ative a disponibilidade; ele só recebe pedidos depois disso.

Compilação para produção: `npm run build` em cada pasta e `npm start` no
back-end. As variáveis do back-end são validadas na inicialização; não
versione `.env`.

## 14. Limitações e hipóteses assumidas

### 14.1 Limitações conhecidas

**Lacunas entre front-end e back-end (modo integrado)**

- A tela de perfil do coletor chama `GET /collectors/me`, rota que ainda não
  existe no back-end. Com `VITE_USE_MOCKS=false`, o perfil mostra erro e a
  disponibilidade não pode ser alterada pela interface; `PATCH
  /collectors/me/availability` funciona diretamente na API.
- A tela de detalhe do atendimento usa `GET /collections/:id`, que responde 403
  para coletores. O botão "Concluir coleta" depende dessa tela. A conclusão
  pela API (`POST /collections/:id/complete`) funciona.
- Os dois pontos acima só aparecem no modo integrado; nos mocks o fluxo
  completo funciona.

**Reconhecimento**

- Nenhuma coleta concluída gera pontos ainda: falta a regra de pontuação.
- `GET /rewards/balance` e `GET /rewards/transactions` respondem 404; o
  front-end já tem os serviços, mas nenhuma tela mostra saldo ou extrato.
  Só o histórico exibe `pointsAwarded`, quando houver.
- Não há catálogo de benefícios: a tabela `Reward` existe, mas não é usada.

**Produto**

- Sem mapa: os pontos aparecem em lista, com coordenadas.
- Sem painel para a EcoRota (gestor); o objetivo de visibilidade da operação
  ainda não tem tela.
- Não há aviso proativo ao morador quando o status muda; ele precisa estar na
  tela de acompanhamento.
- A interface só cria coletas agendadas (data futura obrigatória).
- Sem cadastro público, recuperação de senha nem JWT; as contas vêm do seed.
- Sem edição de data: é preciso cancelar e recriar.

**Integração**

- Atraso de até 5 s no back-end mais até 15 s de polling no front-end entre
  uma mudança na EcoRota e o que o usuário vê.
- Coletas atendidas por coletores `system` aparecem sem coletor.
- Uma chamada à EcoRota pode levar cerca de 15 s antes de falhar, somando
  novas tentativas.
- O limite de vagas (2 customs) restringe quantos coletores próprios existem.
- Se a equipe da EcoRota reiniciar o cenário, coletas em andamento são
  canceladas localmente e não são reenviadas.
- O tratamento de 429 só foi validado por testes automatizados.

**Qualidade**

- Sem testes de ponta a ponta no navegador.
- O sincronizador roda dentro do processo da API: com mais de uma instância,
  haveria sincronizações duplicadas.

### 14.2 Hipóteses assumidas

- O morador entrega o material em pontos predefinidos; não há coleta em
  endereço residencial arbitrário, embora o enunciado mencione endereço. O
  ponto escolhido cumpre esse papel.
- Um coletor custom por usuário coletor basta para a demonstração.
- Polling de 5 s é suficiente para a experiência esperada (decisão descrita em
  `docs/integracao-ecorota.md`).
- O estado local reflete a EcoRota com defasagem aceitável; a EcoRota é a
  fonte da verdade sobre atribuição e chegada.
- Contas de demonstração e tokens opacos bastam para o MVP e o ambiente de
  avaliação.
- A quantidade de pontos por coleta será definida pelo grupo (tarefa 14) e
  poderá depender do material e da quantidade.

### 14.3 Próximos passos sugeridos

1. Criar `GET /collectors/me` e liberar o detalhe da coleta atribuída ao
   coletor, para fechar o fluxo do coletor no modo integrado.
2. Definir a pontuação, disparar o crédito na conclusão e implementar as rotas
   `/rewards`, com saldo e extrato no perfil do morador.
3. Decidir sobre o painel do gestor (demanda por ponto, coletas por semana,
   tempo até a atribuição) e sobre o mapa de pontos.
4. Alinhar o intervalo de polling do front-end (15 s) ao do back-end (5 s).
5. Trocar tokens de demonstração por JWT e habilitar `AUTH_MODE=jwt`.