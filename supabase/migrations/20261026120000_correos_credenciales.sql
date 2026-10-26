-- «Enviar credenciales al correo» (Usuarios y permisos): el registro de correos admite el tipo 'credenciales'.
-- Solo amplía la lista de tipos permitidos; no modifica datos. No se guarda el cuerpo (ni la contraseña).
begin;
alter table public.gth_correos_enviados drop constraint gth_correos_enviados_tipo_check;
alter table public.gth_correos_enviados add constraint gth_correos_enviados_tipo_check
  check (tipo in ('agradecimiento', 'entrevista', 'perfil', 'credenciales'));
commit;
