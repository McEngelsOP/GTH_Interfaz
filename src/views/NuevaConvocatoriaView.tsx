import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { INITIAL_PROFILE_TEMPLATES } from '../data/initialData.ts';
import { JobPosting, JobCategory, Criterion, EvaluationMethod } from '../types/index.ts';
import { Button } from '../components/common/Button.tsx';
import { Input } from '../components/common/Input.tsx';
import { Select } from '../components/common/Select.tsx';
import { Badge } from '../components/common/Badge.tsx';
import {
  PlusCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Sliders,
  ShieldCheck,
  FileCheck,
  Plus,
  Trash2,
} from 'lucide-react';

export function NuevaConvocatoriaView() {
  const { handleCreateJobPosting, setCurrentView, appState } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Paso 1: Plantilla elegida o sin plantilla
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Paso 2: Datos del puesto
  const [code, setCode] = useState(`REQ-2026-NUEVO-${Math.floor(100 + Math.random() * 900)}`);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JobCategory>('docente');
  const [department, setDepartment] = useState('Departamento Académico');
  const [period, setPeriod] = useState('Semestre 2026-II');
  const [vacancies, setVacancies] = useState<string>('1');

  // Paso 3: Qué se evaluará
  const [knockoutRule, setKnockoutRule] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: 'c1', label: 'Experiencia Profesional Comprobada', weightPct: 40, type: 'LLM' },
    { id: 'c2', label: 'Alineamiento Semántico con Syllabus', weightPct: 30, type: 'LLM' },
    { id: 'c3', label: 'Formación Académica y Certificaciones', weightPct: 30, type: 'LLM' },
  ]);

  // Errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar plantilla si fue seleccionada desde la biblioteca de perfiles
  useEffect(() => {
    const preselected = sessionStorage.getItem('SELECTED_TEMPLATE_ID');
    if (preselected) {
      applyTemplate(preselected);
      sessionStorage.removeItem('SELECTED_TEMPLATE_ID');
      setStep(2); // Avanzar directamente al paso 2
    }
  }, []);

  const applyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = INITIAL_PROFILE_TEMPLATES.find((t) => t.id === tplId);
    if (tpl) {
      setTitle(tpl.name);
      setCategory(tpl.category);
      setKnockoutRule(tpl.knockoutRule);
      setCriteria(JSON.parse(JSON.stringify(tpl.criteria)));
    }
  };

  // Cálculo de suma de ponderaciones
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weightPct) || 0), 0);
  const weightDelta = 100 - totalWeight;

  // Manejo de criterios dinámicos
  const handleCriterionChange = (idx: number, field: keyof Criterion, value: any) => {
    setCriteria((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleAddCriterion = () => {
    const newId = `c${Date.now()}`;
    setCriteria((prev) => [
      ...prev,
      { id: newId, label: 'Nuevo criterio de evaluación', weightPct: 10, type: 'LLM' },
    ]);
  };

  const handleRemoveCriterion = (idx: number) => {
    if (criteria.length <= 1) return;
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  // Validaciones por paso
  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Ingrese el título o denominación del puesto';
    if (!department.trim()) errs.department = 'Ingrese el área o departamento';
    if (!code.trim()) errs.code = 'El código de convocatoria es obligatorio';
    else if (appState.jobPostings.some((j) => j.code.toLowerCase() === code.trim().toLowerCase())) errs.code = 'Ya existe una convocatoria con este código';
    if (vacancies && (!Number.isInteger(Number(vacancies)) || Number(vacancies) < 1)) errs.vacancies = 'Indique un número entero positivo de vacantes';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!knockoutRule.trim()) errs.knockoutRule = 'El requisito obligatorio de postulación es indispensable';
    if (totalWeight !== 100) {
      errs.weight = `La ponderación debe sumar exactamente 100% (actualmente suma ${totalWeight}%)`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (status: 'activa' | 'borrador') => {
    if (!validateStep2() || !validateStep3()) return;
    const newJob: JobPosting = {
      id: code.trim(),
      code: code.trim(),
      title: title.trim(),
      category,
      department,
      period,
      status,
      phase: status === 'activa' ? 'Convocatoria Abierta' : 'Borrador en Configuración',
      vacancies: vacancies ? parseInt(vacancies, 10) : null,
      knockoutRule,
      criteria,
      criteriaVersion: 'v1.0',
      defaultTopN: 3,
      templateId: selectedTemplateId || undefined,
      createdAt: new Date().toISOString(),
    };

    handleCreateJobPosting(newJob);
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', width: '100%' }}>
      {/* Cabecera del Asistente */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Crear Nueva Convocatoria
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Configura el puesto, requisitos y criterios. La convocatoria se guarda en este navegador.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('convocatorias')}>
            Cancelar
          </Button>
        </div>

        {/* Indicador de Pasos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {[
            { num: 1, label: 'Punto de partida' },
            { num: 2, label: 'Datos del puesto' },
            { num: 3, label: 'Qué se evaluará' },
            { num: 4, label: 'Revisar y guardar' },
          ].map((st) => {
            const isActive = step === st.num;
            const isCompleted = step > st.num;

            return (
              <div
                key={st.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive
                    ? 'var(--primary-red-subtle)'
                    : isCompleted
                    ? 'var(--status-verified-bg)'
                    : 'var(--bg-base)',
                  border: `1px solid ${
                    isActive
                      ? 'var(--primary-red-border)'
                      : isCompleted
                      ? 'var(--status-verified-border)'
                      : 'var(--border-subtle)'
                  }`,
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isActive
                      ? 'var(--primary-red)'
                      : isCompleted
                      ? 'var(--status-verified-text)'
                      : 'var(--text-muted)',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCompleted ? '✓' : st.num}
                </div>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: isActive || isCompleted ? 600 : 500,
                    color: isActive
                      ? 'var(--primary-red)'
                      : isCompleted
                      ? 'var(--status-verified-text)'
                      : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenido del paso actual */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '1.75rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* PASO 1: Elegir punto de partida */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              1. Elija cómo desea comenzar la convocatoria
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Puede utilizar una plantilla de referencia de perfil de puesto con requisitos y ponderaciones al 100%, o
              iniciar desde cero.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              <div
                onClick={() => {
                  setSelectedTemplateId('');
                  setTitle('');
                  setKnockoutRule('');
                }}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${!selectedTemplateId ? 'var(--primary-red)' : 'var(--border-default)'}`,
                  backgroundColor: !selectedTemplateId ? 'var(--primary-red-subtle)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Comenzar sin plantilla (Desde cero)
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Defina manualmente el título, área, requisito obligatorio y criterios de evaluación.
                  </p>
                </div>
                {!selectedTemplateId && <CheckCircle2 size={20} style={{ color: 'var(--primary-red)' }} />}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0.5rem 0' }} />

              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                O elija una plantilla de referencia:
              </span>

              {INITIAL_PROFILE_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl.id)}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isSelected ? 'var(--primary-red)' : 'var(--border-default)'}`,
                      backgroundColor: isSelected ? 'var(--primary-red-subtle)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {tpl.name}
                        </span>
                        <Badge size="sm" variant="primary">
                          {tpl.code}
                        </Badge>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {tpl.knockoutRule}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 size={20} style={{ color: 'var(--primary-red)', flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="primary" icon={<ArrowRight size={16} />} iconPosition="right" onClick={() => setStep(2)}>
                Continuar a datos del puesto
              </Button>
            </div>
          </div>
        )}

        {/* PASO 2: Datos del puesto */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              2. Datos generales de la convocatoria
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              <Input
                label="Código institucional"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                error={errors.code}
                required
              />
              <Input
                label="Nombre del puesto / Convocatoria"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Profesor de Gestión Estratégica & Transformación Digital"
                error={errors.title}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Select
                label="Categoría del puesto"
                value={category}
                onChange={(e) => setCategory(e.target.value as JobCategory)}
                options={[
                  { value: 'docente', label: 'Docentes e Investigadores' },
                  { value: 'administrativo', label: 'Administrativos y Gestión' },
                  { value: 'operativo', label: 'Operativos y Soporte' },
                  { value: 'directivo', label: 'Directivos' },
                ]}
              />

              <Input
                label="Área o Departamento"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                error={errors.department}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Período académico / Convocatoria"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Ej: Semestre 2026-II"
                required
              />

              <Input
                label="Cantidad de vacantes previstas (opcional)"
                type="number"
                min={1}
                value={vacancies}
                onChange={(e) => setVacancies(e.target.value)}
                helperText="Dejar vacío si aún no está registrado"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => setStep(1)}>
                Volver
              </Button>
              <Button
                variant="primary"
                icon={<ArrowRight size={16} />}
                iconPosition="right"
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
              >
                Continuar a evaluación
              </Button>
            </div>
          </div>
        )}

        {/* PASO 3: Qué se evaluará (Criterios y Requisitos) */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              3. Criterios de evaluación y requisito obligatorio
            </h2>

            {/* Requisito obligatorio */}
            <div>
              <Input
                label="Requisito Obligatorio de Postulación (Filtro inicial)"
                value={knockoutRule}
                onChange={(e) => setKnockoutRule(e.target.value)}
                placeholder="Ej: Maestría registrada en SUNEDU (Ley Universitaria N° 30220)"
                error={errors.knockoutRule}
                helperText="Condición excluyente que debe ser verificada antes de preseleccionar."
                required
              />
            </div>

            {/* Lista de Criterios con Ponderación */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Criterios de Evaluación Específicos:
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: totalWeight === 100 ? 'var(--status-verified-text)' : '#DC2626',
                    }}
                  >
                    Suma actual: {totalWeight}% {weightDelta !== 0 && `(Faltan ${weightDelta}%)`}
                  </span>
                  <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={handleAddCriterion}>
                    Añadir criterio
                  </Button>
                </div>
              </div>

              {errors.weight && (
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--status-failed-bg)',
                    color: 'var(--status-failed-text)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    marginBottom: '0.65rem',
                  }}
                >
                  {errors.weight}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {criteria.map((crit, idx) => (
                  <div
                    key={crit.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '3fr 1fr 1fr auto',
                      gap: '0.5rem',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: 'var(--bg-base)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <input
                      type="text"
                      value={crit.label}
                      onChange={(e) => handleCriterionChange(idx, 'label', e.target.value)}
                      placeholder="Nombre del criterio"
                      className="focus-ring"
                      style={{
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.84rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                      }}
                    />

                    <select
                      value={crit.type}
                      onChange={(e) => handleCriterionChange(idx, 'type', e.target.value as EvaluationMethod)}
                      className="focus-ring"
                      style={{
                        padding: '0.4rem 0.5rem',
                        fontSize: '0.8125rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="LLM">LLM</option>
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={crit.weightPct}
                        onChange={(e) => handleCriterionChange(idx, 'weightPct', parseInt(e.target.value) || 0)}
                        className="focus-ring"
                        style={{
                          width: '55px',
                          padding: '0.4rem 0.3rem',
                          textAlign: 'center',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(idx)}
                      disabled={criteria.length <= 1}
                      className="focus-ring"
                      title="Eliminar criterio"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: criteria.length <= 1 ? 'not-allowed' : 'pointer',
                        padding: '0.2rem',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => setStep(2)}>
                Volver
              </Button>
              <Button
                variant="primary"
                icon={<ArrowRight size={16} />}
                iconPosition="right"
                onClick={() => {
                  if (validateStep3()) setStep(4);
                }}
              >
                Continuar a revisión
              </Button>
            </div>
          </div>
        )}

        {/* PASO 4: Revisar y guardar */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              4. Revisión final y activación
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Revise el resumen de la convocatoria. Una nueva convocatoria comienza con 0 postulantes; la carga o
              recepción de archivos se gestiona posteriormente.
            </p>

            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-red)' }}>
                  {code} · {category.toUpperCase()}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  {department} · {period} · Vacantes: {vacancies || 'No registrado'}
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Requisito obligatorio:
                </span>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{knockoutRule}</p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Criterios y ponderaciones configuradas (Total 100%):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                  {criteria.map((c) => (
                    <div
                      key={c.id}
                      style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{c.label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary-red)' }}>
                        {c.type} · {c.weightPct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => setStep(3)}>
                Modificar criterios
              </Button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button variant="secondary" onClick={() => handleSave('borrador')}>
                  Guardar como borrador
                </Button>
                <Button variant="primary" icon={<FileCheck size={16} />} onClick={() => handleSave('activa')}>
                  Activar convocatoria
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


