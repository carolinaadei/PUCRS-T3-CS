# ViajaJunto — Frontend

Interface web do ViajaJunto, o planejador de viagens colaborativo — sozinho, com
amigos ou em família. Consome a API do backend deste repositório sem alterá-la.

React 18 + TypeScript + Vite, TanStack Query, React Router e `react-globe.gl`.

## Como rodar

1. Suba o backend (na raiz do repositório), como descrito no README principal:

   ```powershell
   docker compose up -d --build
   ```

   Se a porta 5432 já estiver ocupada na sua máquina, escolha outra só para o banco:
   `$env:POSTGRES_PORT = "5434"; docker compose up -d`.

2. Rode o frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. Abra <http://localhost:3000>. Em desenvolvimento, a tela de login tem um botão que
   preenche a conta de demonstração do seed (`criador.demo@example.com` / `DemoViaja123!`).

A porta 3000 é fixa porque o backend gera os links de convite (`/convite?token=…`) e
de redefinição de senha (`/redefinir-senha?token=…`) apontando para ela. Os emails
caem no Mailpit, em <http://localhost:8025>.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com proxy para a API |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção, também com o proxy |
| `npm run typecheck` | Só a checagem de tipos |

### Por que um proxy

A API não habilita CORS. Em vez de mudar o backend, o Vite atende o frontend e repassa
`/api/*` para `http://localhost:8000` na mesma origem (veja `vite.config.ts`). Para
publicar em produção, sirva o `dist/` atrás de um proxy reverso que faça o mesmo
repasse de `/api`, ou aponte `VITE_API_URL` para a API — nesse caso o backend
precisará liberar CORS para o domínio do frontend. Variáveis em `.env.example`.

## Telas e endpoints

| Tela | Rota | Endpoints usados |
| --- | --- | --- |
| Início | `/` | `GET /catalogo/destinos`, `GET /catalogo/destinos/ranking` |
| Entrar, cadastro, senha | `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | `/auth/*`, `POST /usuarios`, `GET /usuarios/me` |
| Explorar | `/explorar` | `GET /catalogo/destinos`, `GET /catalogo/atividades[/{id}]` |
| Destino | `/explorar/destinos/:id` | `GET /catalogo/destinos/{id}`, `POST /viagens/{id}/destinos` |
| Minhas viagens | `/viagens` | `GET/POST /viagens`, `GET /viagens/{id}/destinos`, `GET /usuarios/me/paises-visitados` |
| Viagem — Roteiro | `/viagens/:id` | `/viagens/{id}`, `/destinos`, `/destinos/ordem`, `/atividades`, `PUT …/avaliacao` |
| Viagem — Mapa | `?aba=mapa` | `GET /viagens/{id}/mapa` |
| Viagem — Orçamento | `?aba=orcamento` | `GET/PUT /viagens/{id}/orcamento` |
| Viagem — Pessoas | `?aba=pessoas` | `/viagens/{id}/membros`, `/viagens/{id}/convites` |
| Aceitar convite | `/convite?token=` | `POST /viagens/convites/aceitar` |
| Perfil | `/perfil` | `PATCH/DELETE /usuarios/me`, `PATCH /usuarios/me/senha`, países visitados |
| Notificações | barra superior | `/notificacoes`, contador com polling a cada 45 s |

As permissões seguem a matriz do backend: o organizador (criador) faz tudo; editores
alteram roteiro, atividades, orçamento e status; visualizadores acompanham e avaliam
atividades concluídas. A interface esconde o que o papel não permite, e a API continua
sendo quem decide.

## Design

- **Apple Human Interface Guidelines**: hierarquia tipográfica (SF Pro quando disponível,
  Inter como alternativa), grid de 8 pt, alvos de toque de 44 px, controles segmentados,
  sheets para tarefas curtas e modo escuro automático (ou escolhido no menu da conta).
- **Liquid Glass** (`src/styles/glass.css`): superfícies translúcidas em camadas — desfoque
  e saturação do fundo, brilho interno que acompanha o ponteiro, borda especular e
  sombras internas de espessura. Com `prefers-reduced-transparency`, viram superfícies
  sólidas; com `prefers-reduced-motion`, as animações e o giro do globo param.
- **Paleta azul e verde** (`src/styles/tokens.css`), com o degradê da marca indo de um ao
  outro, inclusive nos pontos do globo.
- **Globo**: na página inicial, os destinos do catálogo (e alguns lugares de inspiração)
  ficam marcados; conforme o globo gira, o lugar de frente para a câmera abre um cartão
  com foto. Na viagem, o globo mostra a rota entre as paradas; no perfil, os países
  visitados.
- Referências: busca em destaque (momondo), cartões com foto e legenda sobre a imagem
  (withlocals) e roteiro com várias paradas (airwander).

## Estrutura

```text
src/api/          Cliente HTTP, tipos espelhando os schemas Pydantic e endpoints
src/state/        Sessão (JWT), toasts e tema
src/components/   UI base (Glass, Sheet, Field…), layout, globos e sheets reutilizáveis
src/pages/        Telas; pages/viagem/ reúne as abas da viagem
src/styles/       Tokens, base, vidro, componentes e estilos por área
src/utils/        Formatação pt-BR, rótulos, fotos de destaque e hooks
```

## Limitações conhecidas

- O tipo da viagem (Individual, Amigos, Família) é escolhido na criação, mas a API não
  tem esse campo: ele fica salvo no navegador de quem criou e não aparece para os outros.
- A foto do “Coliseu” no seed do backend aponta para uma URL que responde 404; a
  interface mostra um fundo neutro no lugar.
- As fotos de inspiração do globo vêm do Unsplash e exigem internet.
