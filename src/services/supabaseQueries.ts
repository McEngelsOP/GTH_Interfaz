export const faltaConsultaPostulaciones = (error: { code?: string } | null) =>
  error?.code === 'PGRST202' || error?.code === '42883';
