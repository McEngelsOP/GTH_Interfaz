-- Ejecutar en GTHC después de superadministracion_y_sueldos.
-- Conserva importes, permisos RLS y el sello de autor/fecha existentes.
begin;
alter table public.gth_sueldos_ofertados
  add column modo_sueldo text not null default 'estricto'
  constraint gth_sueldo_modo_valido check (modo_sueldo in ('estricto', 'manejable'));
comment on column public.gth_sueldos_ofertados.modo_sueldo is
  'Estricto por defecto. Manejable permite señalar negociación para puntaje vigente >= 0.70; no aprueba el sueldo ni altera el ranking.';
commit;
