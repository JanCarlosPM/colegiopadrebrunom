type AsyncStateProps = {
  loading?: boolean;
  isEmpty?: boolean;
  loadingText?: string;
  emptyText?: string;
};

export function AsyncState({
  loading = false,
  isEmpty = false,
  loadingText = "Cargando...",
  emptyText = "No hay datos disponibles.",
}: AsyncStateProps) {
  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-8">{loadingText}</p>;
  }

  if (isEmpty) {
    return <p className="text-center text-sm text-muted-foreground py-8">{emptyText}</p>;
  }

  return null;
}
