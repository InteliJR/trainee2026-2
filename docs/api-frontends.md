# API para os front-ends

Base local: `http://localhost:3333/api/v1`. Esta página distingue rotas que já
funcionam das rotas ainda planejadas. A aplicação pode rodar localmente com
banco PostgreSQL hospedado no Supabase.

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
| GET | `/collections/dashboard` | Morador | `200`, indicadores e coletas ativas |
| GET | `/collections/:id` | Morador proprietário | `200`, coleta própria |
| POST | `/collections/:id/cancel` | Morador proprietário | `200`, coleta atualizada |
| PATCH | `/collectors/me/availability` | Coletor | `200`, coletor atualizado |
| GET | `/collectors/me/assignment` | Coletor | `200`, coleta atribuída ou `null` |
| GET | `/collectors/me/collections` | Coletor | `200`, agenda do dia ou coletas concluídas, paginadas |
| GET | `/collectors/me/collections/:id` | Coletor atribuído | `200`, detalhe da coleta |
| GET | `/collectors/me/summary` | Coletor | `200`, total concluído e pontos frequentes |
| POST | `/collections/:id/complete` | Coletor atribuído | `200`, coleta concluída |
| GET | `/rewards/balance` | Morador | `200`, pontos e total de coletas concluídas |

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
`additional`. A rota lê o banco local, que a sincronização com a EcoRota
preenche a cada 5 s. Sem `ECOROTA_API_TOKEN` no back-end, a lista pode estar
vazia.

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
coleta confirmada externamente. A mesma resposta vale se a EcoRota aceitar o
pedido, mas falhar a gravação do identificador externo. O servidor tentará
novamente com a mesma referência. Para alterar a data, cancele a coleta e
crie outra.

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
**local**, atualizado pela sincronização com a EcoRota a cada 5 s. Consultar a
cada 5 s é suficiente para acompanhar atribuição e conclusão. `collector` só é
preenchido para coletores da plataforma; coletores automáticos da EcoRota
aparecem como `null`, mesmo com `status: "assigned"`.

`GET /collections?limit=20&cursor=<cursor>&status=pending` lista apenas
coletas do morador autenticado, da mais recente para a mais antiga. `cursor` e
`status` são opcionais; `status` aceita os sete estados acima.
`nextCursor: null` indica fim da lista.

O filtro `stage=active` reúne `scheduled`, `pending`, `assigned`,
`in_service` e `integration_failed`; `stage=finished` reúne `completed` e
`cancelled`. Quando `status` e `stage` são enviados juntos, `status` prevalece.

`GET /collections/dashboard` fornece `total`, `active`, `completed`,
`cancelled`, `materialCounts` e até três `activeCollections`. Os números de
materiais contam registros, não peso.

`POST /collections/:id/cancel` não recebe corpo. Coletas `scheduled` ou
`integration_failed` sem identificador externo são canceladas localmente, desde
que o bloqueio de envio esteja livre ou expirado. Para `pending` e `assigned`,
a EcoRota precisa aceitar o cancelamento; se o atendimento já começou lá, a API
responde 409 `COLLECTION_NOT_CANCELLABLE` mesmo que o estado local ainda diga
`assigned`. `in_service`, `completed` e `cancelled` retornam 409. Um envio que
chegou à EcoRota sem o identificador ter sido gravado é religado pela
sincronização, usando a referência. O coletor **não** usa essa rota.

## Front-end do coletor

O coletor precisa estar vinculado a um coletor custom da EcoRota. Isso é feito
uma vez pelo back-end com `npm run ecorota:provision-collector -- <email>`. Sem
esse vínculo, as rotas abaixo respondem 404 (disponibilidade) ou `null`
(atribuição).

`PATCH /collectors/me/availability` recebe `{ "available": true }` e devolve:

```json
{
  "data": {
    "id": "<id do usuário>",
    "name": "Coletor Demo",
    "available": true,
    "status": "idle"
  }
}
```

`status` pode ser `idle`, `moving`, `collecting` ou `unavailable`. O coletor
custom começa indisponível. Ao ficar indisponível, ele para de receber novos
atendimentos, mas precisa concluir os já atribuídos.

`GET /collectors/me/assignment` devolve em `data` a coleta atribuída ao coletor
(`assigned` ou `in_service`, no mesmo formato do morador) ou `null`. Consulte a
cada 5 s.

`GET /collectors/me/collections?view=today&dayStart=<ISO>&dayEnd=<ISO>` lista
atendimentos `assigned` e `in_service` do coletor no intervalo
`dayStart <= data < dayEnd`. Para uma agenda local, envie o início de hoje e
o início de amanhã com fuso explícito. Sem `scheduledAt`, usa `createdAt`.
`view=completed` retorna o histórico concluído do próprio coletor; ambas as
listas aceitam `limit` e `cursor`. O detalhe em
`GET /collectors/me/collections/:id` retorna 404 para coletas de outro
coletor. `GET /collectors/me/summary` retorna `totalCompleted` e
`frequentPoints`, ordenados pela frequência das coletas concluídas.

`POST /collections/:id/complete` não recebe corpo. Só funciona depois que o
coletor chega ao ponto (`in_service` na EcoRota). Antes disso, ou se a coleta
já foi concluída, a API responde 409 `COLLECTION_NOT_COMPLETABLE`. Coleta de
outro coletor responde 403. O coletor não cancela solicitações e
`GET /collections/:id` continua exclusivo do morador.

## Pontos e badges

Cada coleta concluída concede **1 ponto** ao morador, inclusive quando a EcoRota
usa um coletor automático. O crédito é registrado no máximo uma vez por coleta.
A sincronização recupera créditos pendentes após uma falha temporária.

`GET /rewards/balance` devolve:

```json
{ "data": { "balance": 5, "completedCollections": 5 } }
```

O painel do morador libera badges após **1, 5 e 10 coletas concluídas**. As
metas são calculadas a partir de `completedCollections`, para não depender de
um eventual resgate de pontos no futuro. `GET /rewards/transactions` continua
planejado e ainda responde 404; o MVP atual não permite resgatar pontos.
