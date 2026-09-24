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

Controla sua disponibilidade, visualiza atendimentos atribuídos, consulta detalhes e confirma ou cancela a coleta quando permitido.

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
- Autenticação real com JWT ou permanência do modo de demonstração na entrega.
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

## 11. Testes

## 12. Critério de conclusão do MVP

O fluxo principal estará concluído quando for possível:

1. acessar a aplicação como morador;
2. selecionar um ponto;
3. criar uma solicitação;
4. acompanhar a atribuição do coletor;
5. acessar a aplicação como coletor;
6. visualizar o atendimento;
7. concluir ou cancelar conforme as regras;
8. retornar ao perfil do morador;
9. visualizar a coleta no histórico;
10. visualizar o reconhecimento concedido uma única vez.
