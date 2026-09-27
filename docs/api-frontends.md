# API para os front-ends

Base local: `http://localhost:3333/api/v1`. Esta página distingue rotas que já
funcionam das rotas cujo contrato foi definido, mas cuja implementação ainda
depende da integração EcoRota ou da regra de pontuação.

## Convenções compartilhadas

- Envie e receba JSON em `camelCase`. Datas usam ISO 8601 com fuso explícito;
  identificadores públicos são UUIDs.
- Após o login, envie `Authorization: Bearer <accessToken>` em todas as rotas,
  exceto `/auth/login` e `/health`.
- Respostas individuais usam `{ "data": ... }`; listas paginadas usam
  `{ "data": [...], "nextCursor": string | null }`. O cursor é opaco: envie-o
  sem decodificar, junto com o mesmo filtro e `limit`.
- `limit` aceita 1–100 e vale 20 por padrão. O front-end usa somente o `id`
  local da coleta. `externalReference` e `ecorotaRequestId` nunca aparecem
  nas respostas públicas.
- Falhas usam `code`, `message`, `details` e `requestId`. O mesmo ID aparece
  no header `x-request-id`.
  Trate `code` como identificador estável e mostre `message` ao usuário quando
  apropriado; não dependa do texto exato da mensagem.

| HTTP | Significado mais comum |
| --- | --- |
| 400 | Corpo, cursor ou agendamento inválido |
| 401 | Token ausente ou inválido |
| 403 | Perfil sem permissão |
| 404 | Rota, ponto ou coleta própria não encontrada |
| 409 | Estado impede cancelamento ou conclusão |
| 500 | Falha interna inesperada |
| 503 | Integração EcoRota indisponível |

## Rotas disponíveis agora

| Método | Caminho | Acesso | Resposta |
| --- | --- | --- | --- |
| GET | `/health` (sem `/api/v1`) | Público | `{ "status": "ok", "service": "ecorota-backend" }` |
| POST | `/auth/login` | Público | `200`, token e usuário |
| GET | `/auth/me` | Autenticado | `200`, usuário atual |
| GET | `/collection-points` | Autenticado | `200`, lista de pontos locais |
| GET | `/collection-points/:id` | Autenticado | `200`, ponto local |
| POST | `/collections` | Morador | `201`, coleta criada |
| GET | `/collections` | Morador | `200`, histórico próprio paginado |
| GET | `/collections/:id` | Morador proprietário | `200`, coleta própria |
| POST | `/collections/:id/cancel` | Morador proprietário | `200`, coleta atualizada |

### Login para ambos os perfis

`POST /auth/login` recebe:

```json
{ "email": "demo-resident@ecorota.local", "password": "<senha-do-seed>" }
```

Resposta:

```json
{
  "data": {
    "accessToken": "<token>",
    "tokenType": "Bearer",
    "user": {
      "id": "7f5b0932-51de-4b93-8526-4fdcb0d56fb8",
      "name": "Morador Demo",
      "email": "demo-resident@ecorota.local",
      "role": "resident"
    }
  }
}
```

O seed também cria `demo-collector@ecorota.local` com a mesma senha escolhida
em `DEMO_PASSWORD`. Um login de coletor devolve `role: "collector"`. Não há
cadastro público nem JWT nesta etapa. `GET /auth/me` devolve apenas o objeto
`user` dentro de `data`.

## Front-end do morador

### Pontos de coleta

`GET /collection-points` devolve um array não paginado.
`GET /collection-points/:id` devolve um ponto ou 404. Formato:

```json
{
  "id": "0e76397e-154d-48a0-bf76-689a8fed00ac",
  "name": "Ponto Central",
  "kind": "habitual",
  "coordinates": [-46.6, -23.5]
}
```

`coordinates` é `[longitude, latitude]`; `kind` pode ser `habitual` ou
`additional`. A rota lê o banco local. O seed de usuários não inclui pontos;
eles precisam ser carregados pela integração do Glauco. Enquanto isso, a lista
pode estar vazia.

### Criar coleta

`POST /collections` aceita ao menos um material:

```json
{
  "collectionPointId": "0e76397e-154d-48a0-bf76-689a8fed00ac",
  "materials": [
    { "type": "paper", "quantity": 2.5, "unit": "kg" },
    {
      "type": "other",
      "quantity": 2,
      "unit": "units",
      "description": "Baterias"
    }
  ],
  "scheduledAt": "2026-10-01T15:00:00.000Z",
  "notes": "Retirar na portaria"
}
```

`scheduledAt` e `notes` são opcionais. A data, se fornecida, deve estar no
futuro. Materiais: `paper`, `plastic`, `glass`, `metal`, `electronics`, `other`.
Unidades: `kg`, `units`, `bags`. A quantidade deve ser positiva e no máximo
999999999; `kg` admite até três casas decimais, as outras unidades exigem
inteiro. `other` exige `description` (até 120 caracteres); `notes` aceita até
500 caracteres.

Sem data, o back-end tenta enviar imediatamente pelo gateway EcoRota. Com
data, salva localmente como `scheduled` e só tenta enviar quando chegar a hora.
Se o envio falhar ou o adaptador ainda não estiver instalado, a API ainda
responde `201`, mas com `status: "integration_failed"`; não trate isso como
coleta confirmada externamente. O servidor tentará novamente com a mesma
referência. Para alterar a data, cancele a coleta e crie outra.

### Acompanhar, cancelar e consultar histórico

`GET /collections/:id` devolve a coleta completa. Uma coleta de outro morador
retorna 404. Exemplo do objeto em `data`:

```json
{
  "id": "7f5b0932-51de-4b93-8526-4fdcb0d56fb8",
  "status": "scheduled",
  "resident": { "id": "7f5b0932-51de-4b93-8526-4fdcb0d56fb8", "name": "Morador Demo" },
  "collector": null,
  "collectionPoint": { "id": "0e76397e-154d-48a0-bf76-689a8fed00ac", "name": "Ponto Central" },
  "materials": [{ "type": "paper", "quantity": 2.5, "unit": "kg" }],
  "scheduledAt": "2026-10-01T15:00:00.000Z",
  "notes": "Retirar na portaria",
  "pointsAwarded": null,
  "createdAt": "2026-09-26T12:00:00.000Z",
  "updatedAt": "2026-09-26T12:00:00.000Z"
}
```

Estados possíveis: `scheduled`, `pending`, `assigned`, `in_service`,
`completed`, `cancelled`, `integration_failed`. A consulta mostra o estado
**local**. A atualização após mudanças externas depende da sincronização do
Glauco.

`GET /collections?limit=20&cursor=<cursor>&status=pending` lista apenas
coletas do morador autenticado, da mais recente para a mais antiga. `cursor` e
`status` são opcionais; `status` aceita os sete estados acima.
`nextCursor: null` indica fim da lista.

`POST /collections/:id/cancel` não recebe corpo. Coletas `scheduled` ainda não
enviadas são canceladas localmente. Para `pending` e `assigned`, o gateway
precisa aceitar o cancelamento; `in_service`, `completed` e `cancelled`
retornam 409. Uma tentativa de envio com resultado incerto pode exigir
reconciliação com a EcoRota antes de cancelar. O coletor **não** usa essa rota.

## Front-end do coletor: contratos ainda sem rota

O login e `/auth/me` já funcionam para o perfil `collector`. As rotas abaixo
foram definidas como contrato, mas **ainda não estão disponíveis**. Os novos
caminhos respondem 404; `GET /collections/:id` já existe, mas responde 403
para coletores. Não conecte telas a eles como se já estivessem disponíveis.

| Método | Caminho planejado | Entrada/saída prevista |
| --- | --- | --- |
| PATCH | `/collectors/me/availability` | `{ "available": boolean }` → coletor atualizado |
| GET | `/collectors/me/assignment` | Coleta atribuída em `data` ou `null` |
| GET | `/collections/:id` para coletor | Detalhe da coleta atribuída |
| POST | `/collections/:id/complete` | Coleta atualizada após confirmação |

O objeto do coletor previsto tem `id`, `name`, `available` e `status` (`idle`,
`moving`, `collecting`, `unavailable`). O contrato de coleta é o mesmo exibido
ao morador, sem identificadores externos. Disponibilidade, atribuição,
confirmação e atualização de estados dependem do trabalho do Glauco. O coletor
não cancela solicitações.

## Pontos: regra ainda pendente

`GET /rewards/balance` e `GET /rewards/transactions` também são contratos
definidos, mas ainda respondem 404. O saldo deverá retornar `data.balance`
como inteiro; o extrato deverá ser paginado por cursor. A proteção
interna contra crédito duplicado já existe, mas **não calcula pontos nem
dispara créditos automaticamente**. A fórmula e a integração da task 14 serão
decididas depois pelo grupo.

Os schemas executáveis estão em `backend/src/contracts`; esta página deve ser
atualizada quando as rotas pendentes forem implementadas.
