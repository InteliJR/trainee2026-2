# Contrato proposto: dashboard global EcoRota

Esta tela está em demonstração e usa dados locais fictícios. Nenhuma destas
rotas analíticas existe ainda. O prefixo segue a API atual:
`/api/v1/ecorota/dashboard`.

## Acesso

Os endpoints abaixo expõem dados agregados de todos os moradores e coletores.
Devem exigir autenticação e uma permissão administrativa da EcoRota. Hoje o
backend reconhece somente os perfis `resident` e `collector`; é necessário
definir como operadores EcoRota serão autenticados/autorizados antes de
publicar estas rotas. Não liberar estes dados para os dois perfis existentes.

## Parâmetros comuns de período

Os endpoints de indicadores aceitam:

| Parâmetro | Valores | Regra |
| --- | --- | --- |
| `period` | `day`, `week`, `month`, `year`, `total` | Obrigatório. Dia/semana/mês/ano correntes no fuso indicado; `total` cobre todo o histórico. |
| `timezone` | Fuso IANA, por exemplo `America/Sao_Paulo` | Obrigatório para agrupar por calendário local. |

Limites recomendados: `day` agrega por hora, `week` por dia da semana, `month`
por dia, `year` por mês e `total` por ano. Retornar os limites efetivos do
período em ISO 8601 para que o front-end possa identificá-los.

**Pré-requisito de dados:** o modelo atual não registra quando uma coleta foi
concluída. Adicionar `completedAt` à coleta e preenchê-lo na primeira transição
para `completed` (inclusive via sincronização EcoRota). Não usar `updatedAt`,
pois esse campo também muda por outras atualizações. Volume coletado e ranking
de material/pontos usam coletas concluídas por `completedAt`; sem esse campo,
essas séries temporais não são confiáveis.

## 1. Resumo e séries temporais

`GET /api/v1/ecorota/dashboard/overview?period=month&timezone=America%2FSao_Paulo`

Retorna os cartões, evolução de coletas e evolução da quantidade de material.
Uma coleta deve ser contada uma vez pelo seu registro local e agrupada por
`createdAt`. Incluir solicitações aceitas com estado ativo, concluído ou
cancelado; excluir `integration_failed`. Para quantidades, somar
`CollectionMaterial.quantity` por unidade em coletas concluídas no intervalo de
`completedAt`; nunca somar kg, unidades e sacos entre si.

```json
{
  "data": {
    "period": "month",
    "timezone": "America/Sao_Paulo",
    "from": "2026-09-01T03:00:00.000Z",
    "to": "2026-10-01T03:00:00.000Z",
    "collectionCount": 1031,
    "completedCount": 871,
    "cancelledCount": 130,
    "activeCount": 30,
    "completionRate": 0.8701,
    "completionRateDenominator": 1001,
    "materialQuantity": { "kg": 8375, "units": 412, "bags": 86 },
    "materialQuantityByType": [
      { "type": "paper", "kg": 2840, "units": 12, "bags": 4 }
    ],
    "inProgressNow": {
      "total": 18,
      "assigned": 12,
      "inService": 6
    },
    "collectionTrend": [
      {
        "bucketStart": "2026-09-01T03:00:00.000Z",
        "label": "Sem 1",
        "collections": 221,
        "materialQuantity": { "kg": 1781, "units": 81, "bags": 14 }
      }
    ]
  }
}
```

`completionRate` é `completedCount / (completedCount + cancelledCount)` para as
solicitações criadas dentro do período (coorte por `createdAt`), isto é, a taxa
entre solicitações encerradas. `integration_failed` fica fora do denominador
por não representar coleta aceita pela operação. `activeCount` conta, na mesma
coorte, solicitações `scheduled`, `pending`, `assigned` ou `in_service` no
momento da consulta. O total em andamento é um retrato de todas as coletas
`assigned` e `in_service` agora e não deve mudar quando o usuário troca o
período. Os arrays de tendência devem conter todos os intervalos, inclusive os
que tiverem zero coletas.

## 2. Materiais e pontos mais frequentes

`GET /api/v1/ecorota/dashboard/distributions?period=month&timezone=America%2FSao_Paulo`

Retorna rankings globais de coletas concluídas no intervalo por `completedAt`.
Para material, frequência significa número de registros de material
(`CollectionMaterial`); também devolver a quantidade agregada separada por
unidade. Para pontos, contar coletas concluídas por ponto.

```json
{
  "data": {
    "period": "month",
    "materials": [
      { "type": "paper", "collectionCount": 331, "kg": 2840, "units": 12, "bags": 4 }
    ],
    "topMaterial": { "type": "paper", "collectionCount": 331 },
    "collectionPoints": [
      { "id": "uuid", "name": "Ponto Central", "collectionCount": 184 }
    ]
  }
}
```

Ordenar ambos os rankings por frequência decrescente. Recomenda-se retornar
todos os tipos de material e os dez pontos mais frequentes, incluindo empates
na última posição, se for simples fazê-lo.

## 3. Horários de pico dos agendamentos

`GET /api/v1/ecorota/dashboard/scheduled-hours?period=month&timezone=America%2FSao_Paulo`

Agrupa solicitações pelo horário local de `scheduledAt`. Esta métrica representa
o horário escolhido pelo morador, não a hora real em que o coletor chegou ou
concluiu a coleta. Coletas sem `scheduledAt` não entram. Devolver as 24 horas
para que o gráfico não esconda faixas vazias.

```json
{
  "data": {
    "period": "month",
    "timezone": "America/Sao_Paulo",
    "scheduledCollections": 726,
    "unscheduledCollectionsExcluded": 305,
    "hours": [
      { "hour": 0, "label": "00h–01h", "count": 0 },
      { "hour": 14, "label": "14h–15h", "count": 108 }
    ]
  }
}
```

## 4. Moradores recorrentes

`GET /api/v1/ecorota/dashboard/recurring-residents?minCompleted=5&limit=20&cursor=<cursor>`

Lista moradores com pelo menos `minCompleted` coletas concluídas em todo o
histórico. `minCompleted` tem mínimo 5 e padrão 5; `limit` segue o padrão já
usado na API (1–100, padrão 20). A lista deve ser paginada com cursor opaco,
ordenada por coletas concluídas decrescentes e depois pelo nome.

```json
{
  "data": [
    {
      "residentId": "uuid",
      "name": "Mariana Costa",
      "completedCollections": 24,
      "lastCompletedAt": "2026-09-28T13:20:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Retornar somente campos necessários ao painel. O schema atual de morador não
possui bairro ou endereço; não inventar essa informação nem expor endereço
residencial para preencher o gráfico.

## Estados incluídos nos indicadores

- `completed`: concluída.
- `cancelled`: cancelada pelo fluxo de negócio.
- `scheduled`, `pending`, `assigned`, `in_service`: ativas.
- `integration_failed`: excluída da taxa de conclusão e dos atendimentos
  aceitos; pode ser apresentada em um indicador separado futuramente.

Filtros e contagens devem sempre usar os registros locais sincronizados com a
EcoRota. As respostas públicas atuais não expõem os identificadores externos,
e estas rotas também não precisam fazê-lo.
