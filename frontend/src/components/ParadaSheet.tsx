import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search, TriangleExclamationPoint } from 'lucide-react';
import { ApiError, mensagemDeErro } from '../api/client';
import { catalogoApi, roteiroApi, viagemApi } from '../api/endpoints';
import type { DestinoCatalogo, DestinoViagem, Viagem } from '../api/types';
import { useDebounced } from '../utils/hooks';
import { fotoDoDestino } from '../utils/featured';
import { countryName, diffDays, formatRange, plural } from '../utils/format';
import { CATEGORIA_DESTINO } from '../utils/labels';
import { Field, LoadingButton, Photo, Sheet, Spinner } from './ui';

interface ParadaSheetProps {
  open: boolean;
  onClose: () => void;
  /** Viagem fixa (dentro da página da viagem). Sem ela, o usuário escolhe. */
  viagem?: Viagem;
  /** Destino fixo (a partir da página do destino). Sem ele, o usuário busca no catálogo. */
  destino?: DestinoCatalogo;
  /** Parada existente: o sheet vira edição de estadia. */
  parada?: DestinoViagem;
  /** Sugestão de chegada (ex.: saída da última parada). */
  chegadaSugerida?: string;
  onSalva?: (parada: DestinoViagem) => void;
}

function BuscaDestino({
  selecionado,
  onSelect,
}: {
  selecionado: DestinoCatalogo | null;
  onSelect: (d: DestinoCatalogo) => void;
}) {
  const [busca, setBusca] = useState('');
  const termo = useDebounced(busca.trim(), 250);
  const resultado = useQuery({
    queryKey: ['catalogo', 'destinos', 'busca', termo],
    queryFn: () => catalogoApi.destinos({ nome: termo || undefined, tamanho_pagina: 12 }),
  });

  return (
    <div className="stack gap-3">
      <div className="input-icon">
        <Search aria-hidden />
        <input
          className="input"
          placeholder="Buscar destino no catálogo"
          aria-label="Buscar destino no catálogo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
        />
      </div>
      <div className="pick-list" role="listbox" aria-label="Destinos do catálogo">
        {resultado.isLoading && (
          <div className="row" style={{ justifyContent: 'center', padding: 24 }}>
            <Spinner />
          </div>
        )}
        {resultado.data?.itens.length === 0 && (
          <p className="subhead secondary" style={{ padding: 16 }}>
            Nenhum destino encontrado para “{termo}”.
          </p>
        )}
        {resultado.data?.itens.map((d) => {
          const ativo = selecionado?.id === d.id;
          return (
            <button
              key={d.id}
              type="button"
              role="option"
              aria-selected={ativo}
              className={`pick-item ${ativo ? 'is-selected' : ''}`}
              onClick={() => onSelect(d)}
            >
              <Photo src={fotoDoDestino(d.nome, d.foto_url)} alt="" className="pick-thumb" />
              <span className="stack grow" style={{ textAlign: 'left' }}>
                <strong className="subhead">{d.nome}</strong>
                <span className="footnote secondary">
                  {countryName(d.pais_codigo)} · {CATEGORIA_DESTINO[d.categoria]}
                </span>
              </span>
              {ativo && <Check className="pick-check" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ParadaSheet({
  open,
  onClose,
  viagem,
  destino,
  parada,
  chegadaSugerida,
  onSalva,
}: ParadaSheetProps) {
  const queryClient = useQueryClient();
  const editando = Boolean(parada);
  const [viagemId, setViagemId] = useState<number | null>(viagem?.id ?? null);
  const [destinoSel, setDestinoSel] = useState<DestinoCatalogo | null>(destino ?? null);
  const [chegada, setChegada] = useState('');
  const [saida, setSaida] = useState('');
  const [hospedagem, setHospedagem] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const viagens = useQuery({
    queryKey: ['viagens', 'editaveis'],
    queryFn: () => viagemApi.listar(1, 100),
    enabled: open && !viagem,
    select: (pagina) => pagina.itens.filter((v) => v.papel_usuario !== 'visualizador'),
  });

  const viagemAtual: Viagem | undefined = useMemo(
    () => viagem ?? viagens.data?.find((v) => v.id === viagemId),
    [viagem, viagens.data, viagemId],
  );

  // Ao abrir (ou trocar de viagem), sugere datas dentro do período da viagem.
  useEffect(() => {
    if (!open) return;
    setErro(null);
    if (parada) {
      setChegada(parada.data_chegada);
      setSaida(parada.data_saida);
      setHospedagem(parada.hospedagem ?? '');
      setDescricao(parada.descricao ?? '');
      return;
    }
    if (viagemAtual) {
      const inicio =
        chegadaSugerida && chegadaSugerida >= viagemAtual.data_inicio && chegadaSugerida <= viagemAtual.data_fim
          ? chegadaSugerida
          : viagemAtual.data_inicio;
      setChegada(inicio);
      setSaida(viagemAtual.data_fim);
    }
  }, [open, parada, viagemAtual, chegadaSugerida]);

  useEffect(() => {
    if (!open) return;
    if (!parada) {
      setHospedagem('');
      setDescricao('');
      setDestinoSel(destino ?? null);
      setViagemId(viagem?.id ?? null);
    }
  }, [open, parada, destino, viagem]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (parada) {
        return roteiroApi.atualizar(parada.viagem_id, parada.id, {
          data_chegada: chegada,
          data_saida: saida,
          hospedagem,
          descricao,
        });
      }
      return roteiroApi.criar(viagemAtual!.id, {
        destino_catalogo_id: destinoSel!.id,
        data_chegada: chegada,
        data_saida: saida,
        hospedagem: hospedagem.trim() || null,
        descricao: descricao.trim() || null,
      });
    },
    onSuccess: (salva) => {
      queryClient.invalidateQueries({ queryKey: ['viagem', salva.viagem_id] });
      queryClient.invalidateQueries({ queryKey: ['roteiro', salva.viagem_id] });
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      onSalva?.(salva);
      onClose();
    },
    onError: (e) => setErro(e instanceof ApiError ? e.message : mensagemDeErro(e)),
  });

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!editando && !viagemAtual) return setErro('Escolha a viagem.');
    if (!editando && !destinoSel) return setErro('Escolha um destino do catálogo.');
    if (!chegada || !saida) return setErro('Informe as datas de chegada e saída.');
    if (saida < chegada) return setErro('A saída não pode ser antes da chegada.');
    salvar.mutate();
  };

  const noites = chegada && saida && saida >= chegada ? diffDays(chegada, saida) : null;
  const limites = viagemAtual;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editando ? `Estadia em ${parada!.destino.nome}` : 'Adicionar parada'}
      subtitle={
        editando
          ? 'Ajuste as datas e os detalhes desta parada.'
          : 'Escolha um destino do catálogo e as datas em que vocês estarão lá.'
      }
      wide={!destino && !editando}
      footer={
        <>
          <button type="button" className="btn btn-gray" onClick={onClose}>
            Cancelar
          </button>
          <LoadingButton
            type="submit"
            form="parada-form"
            className="btn btn-primary"
            loading={salvar.isPending}
          >
            {editando ? 'Salvar' : 'Adicionar ao roteiro'}
          </LoadingButton>
        </>
      }
    >
      <form id="parada-form" className="stack gap-5" onSubmit={enviar} noValidate>
        {erro && (
          <div className="alert alert-danger" role="alert">
            <TriangleExclamationPoint aria-hidden />
            <span>{erro}</span>
          </div>
        )}

        {!viagem && !editando && (
          <Field label="Viagem" hint="Só aparecem viagens em que você pode editar o roteiro.">
            {(p) =>
              viagens.isLoading ? (
                <Spinner />
              ) : viagens.data && viagens.data.length > 0 ? (
                <select
                  {...p}
                  className="select"
                  value={viagemId ?? ''}
                  onChange={(e) => setViagemId(Number(e.target.value) || null)}
                >
                  <option value="">Escolha uma viagem</option>
                  {viagens.data.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome} — {formatRange(v.data_inicio, v.data_fim)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="subhead secondary">
                  Você ainda não tem viagens editáveis. Crie uma em “Minhas viagens”.
                </p>
              )
            }
          </Field>
        )}

        {destino && !editando && (
          <div className="row gap-3 pick-item is-static">
            <Photo src={fotoDoDestino(destino.nome, destino.foto_url)} alt="" className="pick-thumb" />
            <span className="stack">
              <strong className="subhead">{destino.nome}</strong>
              <span className="footnote secondary">{countryName(destino.pais_codigo)}</span>
            </span>
          </div>
        )}

        {!destino && !editando && <BuscaDestino selecionado={destinoSel} onSelect={setDestinoSel} />}

        <div className="form-grid">
          <Field
            label="Chegada"
            hint={limites ? `Viagem: ${formatRange(limites.data_inicio, limites.data_fim)}` : undefined}
          >
            {(p) => (
              <input
                {...p}
                type="date"
                className="input"
                value={chegada}
                min={limites?.data_inicio}
                max={limites?.data_fim}
                onChange={(e) => {
                  setChegada(e.target.value);
                  if (saida && e.target.value > saida) setSaida(e.target.value);
                }}
                required
              />
            )}
          </Field>
          <Field
            label="Saída"
            hint={noites !== null ? (noites === 0 ? 'Bate e volta' : plural(noites, 'noite')) : undefined}
          >
            {(p) => (
              <input
                {...p}
                type="date"
                className="input"
                value={saida}
                min={chegada || limites?.data_inicio}
                max={limites?.data_fim}
                onChange={(e) => setSaida(e.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Hospedagem" className="span-2" hint="Opcional. Ex.: Hotel Copacabana, quarto 304.">
            {(p) => (
              <input
                {...p}
                className="input"
                maxLength={255}
                value={hospedagem}
                onChange={(e) => setHospedagem(e.target.value)}
              />
            )}
          </Field>
          <Field label="Notas da parada" className="span-2" hint="Opcional. Visível para todos da viagem.">
            {(p) => (
              <textarea
                {...p}
                className="textarea"
                maxLength={10000}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            )}
          </Field>
        </div>
      </form>
    </Sheet>
  );
}
