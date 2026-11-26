import type { ReactNode } from 'react';
import { LoadingButton, Sheet } from './ui';

export function ConfirmSheet({
  open,
  onClose,
  titulo,
  children,
  confirmar,
  onConfirmar,
  carregando,
  perigo = true,
}: {
  open: boolean;
  onClose: () => void;
  titulo: string;
  children: ReactNode;
  confirmar: string;
  onConfirmar: () => void;
  carregando?: boolean;
  perigo?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={titulo}
      footer={
        <>
          <button type="button" className="btn btn-gray" onClick={onClose} autoFocus>
            Cancelar
          </button>
          <LoadingButton
            type="button"
            className={`btn ${perigo ? 'btn-danger' : 'btn-primary'}`}
            loading={carregando}
            onClick={onConfirmar}
          >
            {confirmar}
          </LoadingButton>
        </>
      }
    >
      <div className="secondary">{children}</div>
    </Sheet>
  );
}
