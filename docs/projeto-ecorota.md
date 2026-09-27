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

- Polling, WebSocket ou estratégia híbrida.
- Inclusão do painel do gestor no MVP.
- Uso de mapa ou somente lista para seleção dos pontos.
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

## 4. Regras de negócio

## 5. Requisitos não funcionais

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
| Front-end | React | Proposta a confirmar com a equipe de front-end |
| Linguagem do front-end | TypeScript | Definida |
| Build do front-end | Vite | Proposta a confirmar |
| Roteamento | React Router | Proposta a confirmar |
| Estado remoto | TanStack Query | Proposta a confirmar |
| Validação | Zod | Recomendada no front-end e back-end |
| Back-end | Node.js com Fastify | Definida |
| Linguagem do back-end | TypeScript | Definida |
| Banco de dados | PostgreSQL | Definido |
| ORM | Prisma ORM 7 estável | Definido |
| Autenticação inicial | Tokens de demonstração no back-end | Definida |
| Autenticação posterior | JWT | Condicional ao prazo |
| Testes | Vitest | Definido |
| Organização | Pastas independentes `frontend` e `backend` | Definida |

## 8. Modelagem do banco de dados

## 9. Integração EcoRota

## 10. Contrato da API interna

Os schemas Zod em `backend/src/contracts` são a fonte executável deste contrato.
A especificação OpenAPI será consolidada na etapa de documentação das rotas.

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
| GET | `/api/v1/collections/:id` | Envolvido | Detalha coleta própria ou atribuída |
| POST | `/api/v1/collections/:id/cancel` | Morador proprietário | Cancela antes de `in_service` |
| PATCH | `/api/v1/collectors/me/availability` | Coletor | Altera disponibilidade |
| GET | `/api/v1/collectors/me/assignment` | Coletor | Coleta atribuída ou `data: null` |
| POST | `/api/v1/collections/:id/complete` | Coletor atribuído | Confirma coleta em `in_service` |
| GET | `/api/v1/rewards/balance` | Morador | Saldo de pontos |
| GET | `/api/v1/rewards/transactions` | Morador | Extrato com cursor |

Criação retorna HTTP 201. As outras operações bem-sucedidas retornam HTTP 200.
Cancelamento e conclusão devolvem a coleta atualizada.

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
`scheduled` localmente e só é enviada à EcoRota no horário previsto. Para mudar a
data no MVP, o morador cancela e cria outra coleta.

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
