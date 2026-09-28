# Integração com a EcoRota

Referência oficial: <https://ecorota.marcusvalente.dev.br/docs> (guia, Swagger,
WebSocket e `openapi.json`). Este documento resume como o back-end usa a API,
as regras que ela impõe e as limitações conhecidas.

## Configuração

| Variável | Uso |
| --- | --- |
| `ECOROTA_API_URL` | Base da API, sem `/v1`. |
| `ECOROTA_API_TOKEN` | Credencial exclusiva da equipe. Fica **só** em `backend/.env`. |
| `ECOROTA_TIMEOUT_MS` | Tempo máximo de cada chamada (padrão 5000). |

Sem token, o back-end sobe normalmente com um gateway que responde 503
`ECOROTA_UNAVAILABLE`, e a sincronização fica desligada. A credencial só é lida
por `EcoRotaHttpClient`. Ela nunca vai para o front-end, logs ou mensagens de
erro.

Comandos úteis (em `backend/`):

```bash
npm run ecorota:status                                  # ambiente, vagas, coletores, pontos (somente leitura)
npm run ecorota:provision-collector -- <email>          # cadastra o coletor custom do usuário
npm run ecorota:provision-collector -- <email> --link <id-ecorota>  # vincula um custom já existente
```

## Arquitetura

```text
rotas ──> services ──> EcoRotaGateway (interface)
                          ├─ EcoRotaHttpClient      (real, com token)
                          ├─ unavailableEcoRotaGateway (sem token → 503)
                          └─ FakeEcoRota            (testes)
scheduler (5 s) ──> EcoRotaSyncService.syncOnce() ──> GET /v1/snapshot ──> banco local
               └──> CollectionService.processDue() ──> envia coletas pendentes/agendadas
```

Os front-ends leem apenas o banco local. Por isso, trocar polling por
WebSocket no futuro não altera nenhum contrato.

| Arquivo | Responsabilidade |
| --- | --- |
| `src/integrations/ecorota.ts` | Schemas Zod das respostas, tipos e a interface `EcoRotaGateway`. |
| `src/integrations/ecorota-client.ts` | Cliente HTTP: autenticação, timeout, novas tentativas e tradução de erros. |
| `src/services/ecorota-sync-service.ts` | Sincroniza pontos, vínculos de coletores e status das coletas. |
| `src/services/collector-service.ts` | Disponibilidade e cadastro/vínculo do coletor custom. |
| `src/services/coletaService.ts` | Envio, cancelamento, atribuição e confirmação de coletas. |

## Endpoints usados

| EcoRota | Uso no back-end |
| --- | --- |
| `GET /v1/environment` | Checar vagas antes de cadastrar coletor; script de status. |
| `GET /v1/snapshot` | Sincronização periódica (pontos, coletores, solicitações). |
| `GET /v1/collectors` | Validar o vínculo de um custom existente. |
| `POST /v1/collectors` | Cadastrar o coletor custom (script de provisionamento). |
| `PATCH /v1/collectors/{id}` | `PATCH /collectors/me/availability`. |
| `POST /v1/requests` | Enviar coleta com `pointId` e `externalReference = collection:<id-local>`. |
| `GET /v1/requests/{id}` | Conferir solicitações que sumiram do snapshot. |
| `POST /v1/requests/{id}/cancel` | Cancelamento pelo morador. |
| `POST /v1/requests/{id}/complete` | Confirmação pelo coletor custom. |

Não usados por enquanto: `GET /v1/points` e `GET /v1/collectors/{id}` (o
snapshot já cobre), `DELETE /v1/collectors/{id}`, `GET /v1/collectors/{id}/route`,
`GET /v1/requests` e `GET /v1/events`.

## Regras da EcoRota que afetam o sistema

- **Ciclo da solicitação:** `pending → assigned → in_service → completed`.
  Cancelar só é possível antes de `in_service`.
- **Idempotência:** reenviar a mesma `externalReference` para o mesmo ponto
  devolve o pedido existente. É isso que torna seguras as novas tentativas de
  envio e a recuperação.
- **Sem agendamento na EcoRota:** o pedido entra na operação assim que é
  enviado. Coletas agendadas ficam `scheduled` localmente e só são enviadas no
  horário.
- **Coletores:** 2 `system` automáticos (não editáveis) e até 2 `custom`, num
  máximo de 4. Um custom indisponível também ocupa vaga. O custom começa
  indisponível, e cadastrá-lo não garante que ele receba o próximo pedido.
- **Confirmação:** coletores `system` concluem sozinhos. O `custom` fica no
  ponto aguardando `POST /complete`, que só é aceito depois da chegada.
- **Indisponibilidade:** um coletor indisponível para de receber pedidos novos,
  mas precisa resolver os já atribuídos. Só dá para excluir um custom
  indisponível e sem trabalho.
- **Reinício do cenário:** a equipe da EcoRota pode reiniciar o ambiente.
  Recarregue os dados e **não reenvie pedidos antigos automaticamente**.
- **Limites:** 300 chamadas HTTP por minuto e 5 conexões WebSocket por ambiente.

## Tratamento de erros

| Situação na EcoRota | Cliente | Resposta da nossa API |
| --- | --- | --- |
| Timeout / falha de rede | Nova tentativa só em chamadas idempotentes (até 3, com backoff) | 503 `ECOROTA_UNAVAILABLE`, `details.reason: timeout \| network` |
| 5xx | Idem | 503, `reason: upstream_error` |
| 429 | Espera o `Retry-After` (até 10 s) e tenta de novo, em qualquer método | 503, `reason: rate_limited`, `retryAfterSeconds` |
| 401 / 403 | Registra erro de credencial e não tenta de novo | 503, `reason: auth` (o token nunca aparece) |
| 400 / 404 / 409 de negócio | `EcoRotaRejectedError` com status e código originais | Traduzido pelo serviço: 409 `COLLECTION_NOT_CANCELLABLE` / `COLLECTION_NOT_COMPLETABLE`; fora desses casos, 502 |
| Resposta fora do contrato | Registra os campos inválidos | 503, `reason: invalid_response` |

São consideradas idempotentes: GET, `PATCH /collectors/{id}` e
`POST /requests` (por causa da referência). `POST /collectors`, `/cancel` e
`/complete` não são reenviados após timeout, para não ocupar uma segunda vaga
nem repetir comandos.

## Sincronização: decisão polling × WebSocket

**Decisão: polling de `GET /v1/snapshot` a cada 5 s.**

- O guia da EcoRota diz que o projeto inteiro pode ser feito com HTTP periódico
  e sugere 5 s. O WebSocket é opcional e não substitui os comandos.
- O snapshot traz pontos, coletores e solicitações numa única chamada: são 12
  chamadas por minuto, bem abaixo do limite de 300.
- O front-end já precisa consultar a nossa API periodicamente; um WebSocket só
  no back-end não reduziria esse atraso sem também um canal para o navegador.
- O WebSocket exige reconexão, deduplicação por `id`/`revision` e tratamento de
  snapshots substitutos. Fica como evolução possível atrás da mesma
  `EcoRotaSyncService`.

A cada rodada, `syncOnce()`:

1. grava ou atualiza os pontos alterados (pontos removidos são mantidos, porque
   o histórico depende deles);
2. desvincula os coletores locais cujo custom não existe mais (é preciso
   provisionar de novo);
3. atualiza status e coletor das coletas `pending`, `assigned` e `in_service`.
   A escrita é condicionada ao status lido, para não sobrescrever um
   cancelamento concorrente;
4. confere uma a uma, até 5 por rodada, as coletas que sumiram do snapshot. Um
   404 significa que o cenário foi reiniciado: a coleta é cancelada localmente
   com `integrationError`, sem reenvio;
5. religa, pela `externalReference`, as coletas `scheduled` ou
   `integration_failed` cujo envio chegou à EcoRota mas não foi gravado aqui.

As rodadas não se sobrepõem. Se uma demorar, a seguinte é pulada.

## Limitações conhecidas

- **Coletores `system` não têm registro local.** A coleta atribuída a eles fica
  com `collector: null` na nossa API, embora o status apareça certo.
- **Atraso de até 5 s** entre uma mudança na EcoRota e o estado local. Na
  confirmação, a API envia o `complete` mesmo que o estado local ainda diga
  `assigned`; a EcoRota decide se o coletor já chegou.
- **Pontos de recompensa:** a conclusão ainda não dispara crédito. O
  `RewardService` já garante no máximo um crédito por coleta, mas a regra de
  pontuação está pendente.
- **Um coletor custom por usuário coletor**, cadastrado por script, e não por
  tela, para não ocupar vagas por acidente.
- **Vínculo do coletor é local a cada banco.** O "Coletor Demo" já existe na
  EcoRota. Quem usar outro banco (por exemplo, o Supabase) deve **vincular**
  esse coletor com `--link <id-ecorota>` (o id aparece em `npm run
  ecorota:status`), e não cadastrar outro, para não ocupar a última vaga.
- **429 não foi observado na prática.** O tratamento é coberto por testes
  automatizados, mas estourar o limite de propósito afetaria a equipe inteira.
- **Uma chamada pode demorar até cerca de 15 s antes de falhar**, somando
  novas tentativas e `Retry-After`. Isso ainda deve ser reduzido para as
  chamadas feitas durante uma requisição do usuário.

## Validação com a API real

Validado em 28/09/2026 no ambiente "Equipe 2", com o back-end rodando sobre o
Postgres local.

| O que foi testado | Resultado |
| --- | --- |
| Credencial, `GET /v1/environment` e `GET /v1/snapshot` | Aceitos; 12 pontos (6 habituais), 2 coletores `system` |
| Formato do envelope e dos campos | Igual ao OpenAPI; campos extras ignorados sem erro |
| Erros 400, 401 e 404 | `{ code, message, details, requestId }`, com mensagens em português |
| Sincronização dos pontos | Os 12 pontos gravados localmente e servidos por `GET /collection-points` |
| Coleta atendida por coletor `system` | `pending → assigned → in_service → completed` em cerca de 30 s |
| Cadastro do coletor custom e disponibilidade | `POST /v1/collectors` e `PATCH` aceitos; começa `unavailable` |
| Coleta atendida pelo nosso coletor | Atribuída em cerca de 6 s; `complete` aceito depois da chegada, com o estado local ainda `assigned` |
| Cancelamento enquanto `pending` | `200 cancelled`; o sync mantém `cancelled`; um segundo cancelamento responde 409 |

Observações da API real:

- A atribuição levou de 6 a 16 s nas três solicitações de teste.
- O snapshot tinha cerca de 4,7 KB, com `tickMs: 2000` e `pollIntervalMs: 5000`.
- Não há cabeçalhos de limite de chamadas nas respostas normais.
- Os códigos de erro reais vistos foram `INVALID_INPUT` (400), `UNAUTHORIZED`
  (401) e `NOT_FOUND` (404). O código usa o status HTTP, e não a mensagem.

O ambiente ficou com o "Coletor Demo" cadastrado e **indisponível** (3 de 4
vagas) e três solicitações de teste no histórico, com a observação
"(automatizado)": duas concluídas e uma cancelada.
