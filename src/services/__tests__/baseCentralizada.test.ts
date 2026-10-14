import { describe, expect, it } from 'vitest';
import { agruparPersonas, FilaBase, filtrarPersonas, leerIdiomas, normalizarCiudad, SIN_FILTROS } from '../baseCentralizada.ts';
import { COL_CV_ENLACE, COL_CV_ESTADO, cvPersonal, fechaHora, postulantesToTable, vistaPreviaDrive } from '../bumeranSync.ts';

const fila = (extra: Partial<FilaBase>): FilaBase => ({
  persona_id: 'p1', aviso_id: '1', aviso_titulo: 'Analista', aviso_area: 'Administración', id_postulante: 'x', nombre: 'Ana',
  apellido: 'Prueba', email: 'ana@example.test', telefono: null, fecha_postulacion: '2026-10-10', ciudad: 'Lima', puesto_actual: 'Asistente',
  empresa_actual: 'Empresa', area_experiencia: null, estudio: 'Contabilidad', nivel_estudio: 'Terciario/Técnico', estado_estudio: 'Graduado',
  institucion: 'Instituto', idiomas: 'Inglés - Intermedio', cv_url: null, sin_cv: false, ...extra,
});

describe('base centralizada', () => {
  it('lee idiomas y normaliza ciudades', () => {
    expect(leerIdiomas('Inglés - Intermedio / Español - Nativo')).toEqual([{ idioma: 'Inglés', nivel: 'Intermedio' }, { idioma: 'Español', nivel: 'Nativo' }]);
    expect(leerIdiomas(null)).toEqual([]);
    expect(normalizarCiudad('San Juan De Lurigancho.')).toBe('San Juan de Lurigancho');
    expect(normalizarCiudad('  ')).toBeNull();
  });

  it('une las postulaciones de una persona con su aviso más reciente, su mejor estudio y su CV', () => {
    const [ana, beto] = agruparPersonas([
      fila({ aviso_id: '1', fecha_postulacion: '2026-10-01', nivel_estudio: 'Universitario', estudio: 'Administración' }),
      fila({ aviso_id: '2', aviso_titulo: 'Asistente', fecha_postulacion: '2026-10-12', puesto_actual: 'Analista',
        cv_url: 'https://drive.google.com/file/d/abcdefghijk123/view?usp=drivesdk' }),
      fila({ persona_id: 'p2', nombre: 'Beto', fecha_postulacion: '2026-10-05', idiomas: null, sin_cv: true }),
    ]);
    expect(ana).toMatchObject({ nombre: 'Ana Prueba', puesto: 'Analista', nivelEstudio: 'Universitario', estudio: 'Administración',
      ultimaPostulacion: '2026-10-12' });
    expect(ana.avisos.map((a) => a.id)).toEqual(['2', '1']);
    expect(ana.cv).toEqual({ estado: 'disponible', enlace: 'https://drive.google.com/file/d/abcdefghijk123/view?usp=drivesdk',
      vista: 'https://drive.google.com/file/d/abcdefghijk123/preview' });
    expect(beto.cv.estado).toBe('sin_adjunto');
  });

  it('filtra por nivel mínimo de estudios, idioma con nivel, varios avisos y CV', () => {
    const personas = agruparPersonas([
      fila({ persona_id: 'a', nivel_estudio: 'Universitario', idiomas: 'Inglés - Avanzado' }),
      fila({ persona_id: 'b', nivel_estudio: 'Curso', idiomas: 'Inglés - Básico' }),
      fila({ persona_id: 'c', aviso_id: '1', nivel_estudio: 'Master' }), fila({ persona_id: 'c', aviso_id: '2', nivel_estudio: 'Master' }),
    ]);
    const ids = (cambio: object) => filtrarPersonas(personas, { ...SIN_FILTROS, ...cambio }).map((p) => p.id).sort();
    expect(ids({ nivel: 'Universitario' })).toEqual(['a', 'c']);
    expect(ids({ idioma: 'Inglés', nivelIdioma: 'Intermedio' })).toEqual(['a', 'c']);
    expect(ids({ varios: true })).toEqual(['c']);
    expect(ids({ texto: 'contabilidad' })).toEqual(['a', 'b', 'c']);
    expect(ids({ cv: 'con' })).toEqual([]);
  });
});

describe('CV personal y fechas', () => {
  it('arma la vista previa de Drive y reconoce quién no adjuntó CV', () => {
    expect(vistaPreviaDrive('https://drive.google.com/file/d/1AbC-dEf_123456/view?usp=drivesdk')).toBe('https://drive.google.com/file/d/1AbC-dEf_123456/preview');
    expect(vistaPreviaDrive(null)).toBeNull();
    expect(cvPersonal([{ [COL_CV_ESTADO]: 'sin_adjunto' }]).estado).toBe('sin_adjunto');
    expect(cvPersonal([{}]).estado).toBe('pendiente');
  });

  it('lleva el enlace del CV al perfil importado solo si existe', () => {
    const con = postulantesToTable('9', [{ id_postulante: 'a1', datos_json: { Nombre: 'Ana' }, cv_url: 'https://drive.google.com/file/d/x/view', cv_estado: 'descargado' }]);
    expect(con.rows[0]).toEqual(['ID postulante', 'Nombre', COL_CV_ENLACE, COL_CV_ESTADO]);
    expect(con.rows[1]).toEqual(['a1', 'Ana', 'https://drive.google.com/file/d/x/view', 'descargado']);
    expect(postulantesToTable('9', [{ id_postulante: 'a1', datos_json: { Nombre: 'Ana' } }]).rows[0]).toEqual(['ID postulante', 'Nombre']);
  });

  it('muestra una fecha sin hora tal cual, sin correrla un día por la zona horaria', () => {
    expect(fechaHora('2026-10-07')).toBe('07/10/2026');
    expect(fechaHora(null)).toBe('—');
  });
});
