import { Route, Routes } from 'react-router-dom';
import { AppLayout, RequireAuth } from './components/Layout';
import Landing from './pages/Landing';
import { Cadastro, Entrar, RecuperarSenha, RedefinirSenha } from './pages/Auth';
import Explorar from './pages/Explorar';
import DestinoDetalhe from './pages/DestinoDetalhe';
import Viagens from './pages/Viagens';
import ViagemDetalhe from './pages/viagem/ViagemDetalhe';
import Perfil from './pages/Perfil';
import Convite from './pages/Convite';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Landing />} />
        <Route path="entrar" element={<Entrar />} />
        <Route path="cadastro" element={<Cadastro />} />
        <Route path="recuperar-senha" element={<RecuperarSenha />} />
        <Route path="redefinir-senha" element={<RedefinirSenha />} />
        <Route path="explorar" element={<Explorar />} />
        <Route path="explorar/destinos/:id" element={<DestinoDetalhe />} />
        <Route
          path="viagens"
          element={
            <RequireAuth>
              <Viagens />
            </RequireAuth>
          }
        />
        <Route
          path="viagens/:id"
          element={
            <RequireAuth>
              <ViagemDetalhe />
            </RequireAuth>
          }
        />
        <Route
          path="perfil"
          element={
            <RequireAuth>
              <Perfil />
            </RequireAuth>
          }
        />
        <Route path="convite" element={<Convite />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
