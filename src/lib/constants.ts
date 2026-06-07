// Paleta de cores para categorias — usada em gráficos e badges
export const CATEGORIA_CORES: string[] = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#84cc16', // lime
  '#0ea5e9', // sky
]

// Retorna a cor de uma categoria pelo índice (cíclico) ou pela cor definida
export function getCategoriaColor(index: number, corDefinida?: string): string {
  if (corDefinida) return corDefinida
  return CATEGORIA_CORES[index % CATEGORIA_CORES.length]
}
