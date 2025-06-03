# NestJS CASL Auth Canvas: Framework Base para Autenticação e Autorização

Este projeto, `nestjs-casl-auth-canvas`, serve como um framework robusto e desacoplado para aplicações modernas construídas com NestJS. Ele centraliza funcionalidades críticas de autenticação, autorização e controle de permissões (ACL), utilizando tecnologias atuais e aderindo a práticas recomendadas de desenvolvimento, com foco primordial em manutenibilidade, clareza e escalabilidade.

O objetivo principal é fornecer um ponto de partida seguro e reutilizável para novos sistemas, permitindo que a lógica de autenticação e autorização seja facilmente integrada via módulos, bibliotecas internas ou até mesmo exposta como um microsserviço dedicado.

## ✨ Funcionalidades Principais

O framework implementa um conjunto abrangente de funcionalidades essenciais para segurança e gerenciamento de acesso em aplicações web:

- **Autenticação Segura via JWT:** Utiliza JSON Web Tokens (JWT) para autenticação, implementando tokens de acesso (access tokens) de curta duração e tokens de atualização (refresh tokens) de longa duração. Os refresh tokens são gerenciados de forma segura através de cookies `HttpOnly`, com suporte a _sliding sessions_ para renovação automática.
- **Autorização Flexível com CASL:** Emprega a biblioteca CASL (Control Access Specification Language) para um controle de permissões granular e dinâmico. As políticas de permissão são armazenadas diretamente no banco de dados, permitindo fácil gerenciamento e adaptação sem necessidade de rediploys.
- **Integração com Prisma e PostgreSQL:** Utiliza o Prisma ORM para interação com um banco de dados PostgreSQL, garantindo tipagem forte, migrações simplificadas e um acesso eficiente aos dados.
- **API GraphQL Code-First:** Expõe a funcionalidade através de uma API GraphQL, adotando a abordagem _code-first_ do NestJS para uma definição de schema clara e fortemente tipada, diretamente a partir do código TypeScript.
- **Gerenciamento de Usuários Simplificado:** Inclui um módulo básico para gerenciamento de usuários, suportando inicialmente um papel único por usuário (single-role), mas projetado para extensibilidade.
- **Arquitetura Modular e Desacoplada:** Segue os princípios de design modular do NestJS, separando responsabilidades por domínios (auth, casl, users, permissions), promovendo baixo acoplamento e alta coesão.
- **Tipagem Rigorosa com TypeScript:** Todo o código é escrito em TypeScript com modo estrito habilitado, garantindo segurança de tipos e prevenindo erros comuns em tempo de desenvolvimento.
- **Pronto para Testes:** Configurado com Jest para testes unitários e de integração, incentivando a cobertura de testes para garantir a qualidade e a robustez do código.
- **Preparado para Extensões:** A arquitetura foi pensada para facilitar futuras evoluções, como suporte a multi-tenancy, múltiplos papéis por usuário e integração com painéis de administração externos.

## 🏗️ Arquitetura

A estrutura do projeto é organizada em módulos funcionais, seguindo as melhores práticas do NestJS:

- `src/`: Diretório principal do código-fonte.
  - `main.ts`: Ponto de entrada da aplicação.
  - `app.module.ts`: Módulo raiz que importa os demais módulos.
  - `config/`: Módulo para gerenciamento de configurações e variáveis de ambiente (`.env`).
  - `database/`: Módulo global que fornece o `PrismaService` para interação com o banco de dados.
  - `common/`: Contém utilitários compartilhados, como decorators (`@CurrentUser`, `@Public`), filtros de exceção, etc.
  - `auth/`: Módulo responsável pela autenticação (JWT, Passport strategies, guards, DTOs, service, resolver GraphQL).
  - `users/`: Módulo para gerenciamento de usuários (entidade, service, resolver GraphQL).
  - `permissions/`: Módulo para gerenciar as entidades de permissão no banco de dados (entidade, service).
  - `casl/`: Módulo de autorização que integra o CASL (ability factory, guard, decorators).
- `prisma/`: Contém o schema do Prisma (`schema.prisma`) e as migrações.
- `tests/`: Diretório para testes unitários (`*.spec.ts`) e de integração (`*.e2e-spec.ts`).
- `.env.example`: Arquivo de exemplo para as variáveis de ambiente.
- `README.md`: Esta documentação.

## 🚀 Começando

Siga os passos abaixo para configurar e executar o projeto localmente.

### Pré-requisitos

- Node.js (versão LTS recomendada, verifique a versão no `.nvmrc` ou `package.json`)
- npm (geralmente instalado com o Node.js)
- Docker e Docker Compose (para executar o banco de dados PostgreSQL facilmente)
- Git (para clonar o repositório)

### Instalação

1. **Clone o repositório:**

   ```bash
   git clone <url-do-repositorio>
   cd nestjs-casl-auth-canvas
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**

   - Copie o arquivo de exemplo: `cp .env.example .env`
   - Edite o arquivo `.env` e preencha as variáveis, especialmente `DATABASE_URL`, `JWT_SECRET` e `JWT_REFRESH_SECRET`. Use segredos fortes e únicos para JWT.

4. **Inicie o Banco de Dados PostgreSQL (usando Docker):**

   - Certifique-se de que o Docker esteja em execução.
   - Execute o comando abaixo para iniciar um container PostgreSQL com as credenciais definidas no seu `.env` (ajuste se necessário):

     ```bash
     # Exemplo (use as credenciais do seu .env):
     docker run --name postgres-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=mydb -p 5432:5432 -d postgres
     ```

   - _Alternativa:_ Se você já possui uma instância PostgreSQL rodando, apenas configure a `DATABASE_URL` no `.env` para apontar para ela.

5. **Execute as Migrações do Prisma:**

   - Este comando aplicará as migrações pendentes e criará as tabelas no banco de dados conforme definido em `prisma/schema.prisma`.

   ```bash
   npx prisma migrate dev
   ```

   - Ele também gerará o Prisma Client.

### Executando a Aplicação

- **Modo de Desenvolvimento (com hot-reload):**

  ```bash
  npm run start:dev
  ```

  A aplicação estará disponível em `http://localhost:3000` (ou a porta configurada).
  O endpoint GraphQL geralmente fica em `http://localhost:3000/graphql`.

- **Modo de Produção:**

  ```bash
  npm run build
  npm run start:prod
  ```

- **Executando Testes:**

  - Testes Unitários:

    ```bash
    npm run test
    ```

  - Testes End-to-End (E2E):

    ```bash
    npm run test:e2e
    ```

  - Testes com Cobertura:

    ```bash
    npm run test:cov
    ```

## ⚙️ Uso da API (GraphQL)

Acesse o GraphQL Playground (ou Apollo Sandbox) em `http://localhost:3000/graphql` para interagir com a API.

### Exemplos de Operações

- **Registro de Usuário:**

  ```graphql
  mutation Register($registerInput: RegisterDto!) {
    register(registerInput: $registerInput) {
      id
      email
      username
      role
    }
  }
  # Variáveis:
  # { "registerInput": { "email": "user@example.com", "username": "newuser", "password": "password123" } }
  ```

- **Login:**

  ```graphql
  mutation Login($loginInput: LoginDto!) {
    login(loginInput: $loginInput) {
      accessToken
    }
  }
  # Variáveis:
  # { "loginInput": { "identifier": "user@example.com", "password": "password123" } }
  ```

  _Observação:_ O refresh token será definido automaticamente em um cookie `HttpOnly`.

- **Obter Dados do Usuário Logado (requer token de acesso):**

  - Inclua o `accessToken` no header `Authorization: Bearer <token>`.

  ```graphql
  query Me {
    me {
      id
      email
      username
      role
    }
  }
  ```

- **Renovar Token de Acesso (requer cookie de refresh token válido):**

  ```graphql
  mutation RefreshToken {
    refreshToken {
      accessToken
    }
  }
  ```

- **Buscar Usuário por ID (requer permissão de leitura em User):**

  - Inclua o `accessToken` no header `Authorization: Bearer <token>`.

  ```graphql
  query FindUser($userId: ID!) {
    findUserById(id: $userId) {
      id
      email
      username
    }
  }
  # Variáveis:
  # { "userId": "some-user-id" }
  ```

## 🛡️ Fluxos de Autenticação e Autorização

### Autenticação

1. O usuário envia credenciais (email/username + senha) via mutação `login`.
2. O `AuthService` valida as credenciais contra o banco de dados.
3. Se válidas, gera um `accessToken` (curta duração) e um `refreshToken` (longa duração).
4. O `accessToken` é retornado na resposta da mutação.
5. O `refreshToken` é armazenado em um cookie `HttpOnly`, `Secure` (em produção), `SameSite=Strict`.
6. Para acessar rotas protegidas, o cliente envia o `accessToken` no header `Authorization: Bearer <token>`.
7. O `JwtAuthGuard` intercepta a requisição, valida o `accessToken` usando `JwtStrategy`.
8. Se o `accessToken` expirar, o cliente usa a mutação `refreshToken`. O `RefreshJwtGuard` valida o `refreshToken` do cookie usando `RefreshJwtStrategy` e, se válido, o `AuthService` gera um novo `accessToken`.
9. O `logout` limpa o cookie do `refreshToken`.

### Autorização (CASL)

1. Rotas/Mutations/Queries que exigem permissões específicas são decoradas com `@UseGuards(CaslGuard)` e `@CheckPermissions({ action: Action.Read, subject: 'User' })`.
2. O `JwtAuthGuard` (executado antes) garante que o usuário esteja autenticado e anexa o objeto `user` à requisição.
3. O `CaslGuard` é ativado.
4. Ele obtém o usuário da requisição e as regras de permissão (`RequiredRule`) definidas pelo decorator `@CheckPermissions`.
5. O `CaslGuard` utiliza a `CaslAbilityFactory` para construir o objeto `Ability` do usuário.
6. A `CaslAbilityFactory`:
   - Define permissões básicas com base no `Role` do usuário (ex: ADMIN pode `manage all`).
   - Busca permissões adicionais específicas do usuário no banco de dados (tabela `Permission`) através do `PermissionsService`.
   - Combina as permissões baseadas em role e as do banco (incluindo condições e regras `cannot`) para construir o `Ability` final.
7. O `CaslGuard` usa o `Ability` gerado para verificar se o usuário `can(action, subject)` para _todas_ as `RequiredRule` definidas no decorator.
8. Se todas as permissões forem satisfeitas, o acesso é concedido. Caso contrário, uma `ForbiddenException` é lançada.

## 📜 Regras de Código e Estilo

O projeto segue um conjunto rigoroso de regras para garantir a qualidade e a consistência do código:

- **Linguagem:** PT-BR para código e documentação.
- **Tipagem:** TypeScript estrito, sem `any`, tipos explícitos para variáveis, parâmetros e retornos.
- **Nomenclatura:** PascalCase (classes), camelCase (variáveis, métodos), kebab-case (arquivos, pastas), UPPERCASE (env vars).
- **Organização:** Um export por arquivo, evitar números mágicos, funções curtas e com um nível de abstração, usar early returns.
- **Imutabilidade:** Preferir `readonly` e `as const`.
- **Classes:** Princípios SOLID, composição sobre herança, limites de tamanho/complexidade.
- **Erros:** Exceções para erros inesperados, handlers globais.
- **Testes:** Convenção Arrange-Act-Assert, nomes claros, mocks/stubs.
- **NestJS:** Arquitetura modular por domínio, DTOs com `class-validator`, encapsulamento entre módulos (interação via serviços).
- **Linting/Formatting:** ESLint e Prettier configurados para garantir a conformidade.

## 🛣️ Roadmap Futuro (Possíveis Extensões)

- Suporte a Multi-Tenancy (adicionar `tenantId` às entidades relevantes).
- Suporte a Múltiplos Papéis por Usuário.
- Criação de um painel de administração (frontend desacoplado) para gerenciamento visual de usuários e permissões.
- Implementação de blacklist/revogação de refresh tokens.
- Integração com outros provedores de autenticação (OAuth, SAML).

## 🧩 Como Estender ou Integrar

Este framework pode ser usado como base para novos projetos NestJS ou integrado a projetos existentes:

- **Como Base:** Clone o repositório e comece a construir seus módulos de negócio sobre ele.
- **Como Biblioteca Interna:** Refatore os módulos principais (auth, casl, users, permissions) para serem publicados como pacotes npm privados ou bibliotecas internas do NestJS.
- **Como Microsserviço:** Dockerize a aplicação e exponha a API GraphQL para outros serviços consumirem.

Lembre-se de adaptar as entidades, DTOs e permissões CASL às necessidades específicas do seu domínio.
