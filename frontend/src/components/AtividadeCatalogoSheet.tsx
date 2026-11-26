import { useQuery } from '@tanstack/react-query';
import { MapPin, MessageSquare } from 'lucide-react';
import { catalogoApi } from '../api/endpoints';
import { countryName, relativeTime } from '../utils/format';
import { CATEGORIA_ATIVIDADE } from '../utils/labels';
import { Avatar, Photo, Sheet, Spinner, Stars } from './ui';

/** Detalhe público de uma atividade do catálogo, com média e avaliações recentes. */
export function AtividadeCatalogoSheet({
  atividadeId,
  onClose,
}: {
  atividadeId: number | null;
  onClose: () => void;
}) {
  const consulta = useQuery({
    queryKey: ['catalogo', 'atividade', atividadeId],
    queryFn: () => catalogoApi.atividade(atividadeId!),
    enabled: atividadeId !== null,
  });
  const a = consulta.data;

  return (
    <Sheet
      open={atividadeId !== null}
      onClose={onClose}
      title={a?.nome ?? 'Atividade'}
      subtitle={
        a && (
          <>
            {CATEGORIA_ATIVIDADE[a.categoria]} · {a.destino.nome}, {countryName(a.destino.pais_codigo)}
          </>
        )
      }
      wide
    >
      {consulta.isLoading && (
        <div className="row" style={{ justifyContent: 'center', padding: 40 }}>
          <Spinner />
        </div>
      )}
      {a && (
        <div className="stack gap-5">
          <Photo src={a.foto_url} alt={a.nome} className="sheet-photo" eager />
          {a.descricao && <p>{a.descricao}</p>}
          <div className="row wrap gap-4">
            {a.endereco && (
              <span className="row gap-2 subhead secondary">
                <MapPin size={16} aria-hidden /> {a.endereco}
              </span>
            )}
            {a.media_avaliacoes !== null ? (
              <span className="row gap-2 subhead">
                <Stars value={a.media_avaliacoes} />
                <strong className="tabular">{a.media_avaliacoes.toFixed(1)}</strong>
                <span className="secondary">
                  ({a.total_avaliacoes} {a.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'})
                </span>
              </span>
            ) : (
              <span className="subhead tertiary">Ainda sem avaliações</span>
            )}
          </div>

          <div className="stack gap-3">
            <h3 className="headline">Avaliações recentes</h3>
            {a.reviews.length === 0 && (
              <p className="subhead secondary row gap-2">
                <MessageSquare size={16} aria-hidden /> Quem concluir esta atividade numa viagem
                pode deixar a primeira avaliação.
              </p>
            )}
            {a.reviews.map((r) => (
              <article key={r.id} className="review">
                <Avatar name={r.autor_nome ?? 'Anônimo'} seed={r.autor_nome ?? r.id} size={34} />
                <div className="stack gap-1 grow">
                  <div className="row between wrap gap-2">
                    <strong className="subhead">{r.autor_nome ?? 'Conta excluída'}</strong>
                    <span className="caption tertiary">{relativeTime(r.criado_em)}</span>
                  </div>
                  <Stars value={r.nota} />
                  {r.comentario && <p className="subhead">{r.comentario}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
