-- Pesos independientes: cada requisito vale de 0 a 100 por sí mismo y ya no tienen que sumar 100.
-- El puntaje pondera con peso / suma de pesos (igual que matching_llm.py), así que la escala no cambia el resultado.
-- Aplicar después de requisitos_reglas_feedback. No modifica datos.
begin;

drop trigger pesos_suman_100 on public.gth_aviso_requisitos;
drop function gth_privado.validar_pesos_aviso();

commit;
