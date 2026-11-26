import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Empty } from '../components/ui';

export default function NotFound() {
  return (
    <div className="page container">
      <Empty
        icon={<Compass />}
        title="Este caminho não está no mapa"
        action={
          <Link to="/" className="btn btn-primary">
            Voltar ao início
          </Link>
        }
      >
        A página que você procura não existe ou foi movida.
      </Empty>
    </div>
  );
}
