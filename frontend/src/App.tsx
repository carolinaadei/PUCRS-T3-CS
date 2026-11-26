import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import Landing from './pages/Landing';
import { Cadastro, Entrar, RecuperarSenha, RedefinirSenha } from './pages/Auth';
import NotFound from './pages/NotFound';
import Explorar from './pages/Explorar';
import DestinoDetalhe from './pages/DestinoDetalhe';

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
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
