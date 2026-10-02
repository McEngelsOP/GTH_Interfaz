import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { validateProfileCatalogCSV } from '../services/csvService.ts';
import { simulateScoreRecalculation } from '../services/recruitmentRules.ts';
import { Candidate, Application } from '../types/index.ts';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  Sparkles,
  Play,
  FileCode2,
  ArrowRight,
  Cpu,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface UploadedFilePreview {
  name: string;
  size: number;
  type: string;
  recognized: boolean;
  statusMessage: string;
}

export function AgregarArchivosView() {
  const { activeJob, handleAddBatchCandidates, showToast, setCurrentView } = useApp();

  const [files, setFiles] = useState<UploadedFilePreview[]>([]);
  const [csvContentPreview, setCsvContentPreview] = useState<{ headers: string[]; rows: string[][]; errors: string[] } | null>(null);

  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  useEffect(() => {
    setFiles([]); setCsvContentPreview(null); setIsAutoIngesting(false); setIsGenerating(false);
    return () => { timers.current.forEach(clearInterval); timers.current = []; };
  }, [activeJob?.id]);

  // Simulación de carga multi-plataforma
  const [isAutoIngesting, setIsAutoIngesting] = useState(false);
  const [autoIngestProgress, setAutoIngestProgress] = useState(0);
  const [autoIngestPhase, setAutoIngestPhase] = useState('');

  // Generador de lotes demostrativos (25, 100, 500)
  const [batchSize, setBatchSize] = useState<25 | 100 | 500>(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');

  // Iniciar carga automática de CV's multi-plataforma (simulación de integración con LinkedIn y Bolsa ESAN)
  const handleStartAutoIngest = () => {
    if (!activeJob || activeJob.status !== 'activa' || isAutoIngesting || isGenerating) return;

    setIsAutoIngesting(true);
    setAutoIngestProgress(0);
    setAutoIngestPhase('Preparando 6 perfiles ficticios de demostración...');

    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      if (p <= 30) {
        setAutoIngestPhase('Generando expedientes ficticios...');
        setAutoIngestProgress(p);
      } else if (p <= 60) {
        setAutoIngestPhase('Preparando texto sintético del CV...');
        setAutoIngestProgress(p);
      } else if (p <= 85) {
        setAutoIngestPhase('Asignando puntajes demostrativos independientes...');
        setAutoIngestProgress(p);
      } else if (p >= 100) {
        clearInterval(interval);
        setAutoIngestProgress(100);
        setAutoIngestPhase('¡Simulación completada!');

        timers.current.push(setTimeout(() => {
          finalizeBatchGeneration(6);
          setIsAutoIngesting(false);
          showToast('Simulación completada: 6 perfiles ficticios. Los portales y el OCR aún no están conectados.', 'info');
        }, 500));
      }
    }, 280);
    timers.current.push(interval);
  };

  // Manejo de carga de archivos locales manuales
  const processFiles = (uploaded: FileList | null) => {
    if (!uploaded) return;

    const list: UploadedFilePreview[] = [];

    Array.from(uploaded).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let recognized = false;
      let statusMessage = '';

      if (ext === 'md') {
        recognized = true;
        statusMessage = 'Texto Markdown detectado; evaluación y conversión a CSV pendientes de integración.';
      } else if (ext === 'pdf') {
        recognized = true;
        statusMessage = 'PDF detectado. OCR pipeline → CSV pendiente de integración; archivo detectado, aún no procesado.';
      } else if (ext === 'doc' || ext === 'docx') {
        recognized = true;
        statusMessage = 'Documento Word detectado. Extracción → CSV pendiente de integración; archivo detectado, aún no procesado.';
      } else if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
        recognized = true;
        statusMessage = 'Imagen detectada. OCR pipeline → CSV pendiente de integración.';
      } else if (ext === 'csv') {
        recognized = true;
        statusMessage = 'Archivo CSV tabular detectado. Validando catálogo de perfiles de puesto (vista previa, sin importar candidatos)...';

        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          parseAndValidateCSV(text);
        };
        reader.onerror = () => showToast(`No se pudo leer ${file.name}.`, 'error');
        reader.readAsText(file, 'UTF-8');
      } else {
        recognized = false;
        statusMessage = `Formato .${ext} no admitido. Formatos válidos: PDF, Word, Markdown (.md), Imágenes o CSV.`;
      }

      list.push({
        name: file.name,
        size: file.size,
        type: file.type || ext || 'desconocido',
        recognized,
        statusMessage,
      });
    });

    setFiles((prev) => [...prev, ...list]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { processFiles(e.target.files); e.target.value = ''; };

  const parseAndValidateCSV = (text: string) => setCsvContentPreview(validateProfileCatalogCSV(text));

  // Generador de lotes demostrativos (25, 100, 500)
  const handleStartBatchGeneration = () => {
    if (!activeJob || activeJob.status !== 'activa' || isAutoIngesting || isGenerating) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentPhase('Extrayendo CVs de múltiples fuentes sintéticas...');

    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      if (p <= 30) {
        setCurrentPhase('Normalizando expedientes a Markdown estructurado...');
        setGenerationProgress(p);
      } else if (p <= 60) {
        setCurrentPhase('Calculando similitud semántica LLM contra syllabus del puesto...');
        setGenerationProgress(p);
      } else if (p <= 85) {
        setCurrentPhase('Validando requisitos de convocatoria y preparando la evaluación LLM...');
        setGenerationProgress(p);
      } else if (p >= 100) {
        clearInterval(interval);
        setGenerationProgress(100);
        setCurrentPhase('¡Lote normalizado generado exitosamente!');

        timers.current.push(setTimeout(() => {
          finalizeBatchGeneration(batchSize);
          setIsGenerating(false);
          showToast(`Se incorporaron ${batchSize} candidatos de prueba a "${activeJob.title}".`, 'success');
        }, 500));
      }
    }, 280);
    timers.current.push(interval);
  };

  const finalizeBatchGeneration = (count: number) => {
    if (!activeJob) return;

    const firstNames = [
      'Valeria', 'Rodrigo', 'Camila', 'Gonzalo', 'Mariana', 'Esteban', 'Luciana', 'Santiago',
      'Flavia', 'Mateo', 'Renata', 'Álvaro', 'Daniela', 'Joaquín', 'Romina', 'Bruno',
      'Alessandra', 'Ignacio', 'Natalia', 'Sebastián', 'Fabiola', 'Emilio', 'Jimena', 'Mauricio',
    ];
    const lastNames = [
      'Vargas', 'Ramos', 'Castillo', 'Espinoza', 'Navarro', 'Guerrero', 'Paredes', 'Campos',
      'Salazar', 'Mendoza', 'Córdova', 'Reyes', 'Ponce', 'Valdez', 'Barrios', 'Arce',
      'Carrasco', 'Montes', 'Solís', 'Bustamante', 'Pacheco', 'Cabrera', 'Lozano', 'Delgado',
    ];
    const companies = [
      'Belcorp', 'BCP', 'Interbank', 'Alicorp', 'Ferreyros', 'Scotiabank', 'BBVA', 'Telefónica',
      'Rímac Seguros', 'Pacifico', 'Gloria', 'Entel', 'Auna', 'San Fernando', 'Graña y Montero',
    ];
    const titlesByCat: Record<string, string[]> = {
      docente: [
        'Docente Investigador', 'Profesor Adjunto', 'Especialista en Posgrado',
        'Coordinador de Línea Académica', 'Consultor Senior en Estrategia', 'Catedrático de Maestría',
      ],
      administrativo: [
        'Jefe de Operaciones', 'Analista de Planeamiento', 'Coordinador de Programa',
        'Especialista de Calidad', 'Subgerente de Finanzas',
      ],
      operativo: [
        'Asistente Técnico', 'Coordinador de Infraestructura', 'Analista de Mesa de Ayuda',
        'Supervisor de Servicios',
      ],
      directivo: [
        'Director Académico', 'Gerente de Unidad', 'Decano de Facultad', 'Director Ejecutivo',
      ],
    };

    const titles = titlesByCat[activeJob.category] || titlesByCat.docente;
    const now = new Date().toISOString();
    const newCandidates: Candidate[] = [];
    const newApps: Application[] = [];

    for (let i = 0; i < count; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[(i * 7) % lastNames.length];
      const comp = companies[i % companies.length];
      const tit = titles[i % titles.length];

      const candId = `cand-gen-${Date.now()}-${i}`;
      const appId = `app-gen-${Date.now()}-${i}`;

      const criteriaBreakdown = Object.fromEntries(activeJob.criteria.map((c, ci) => [c.id, {
        score: 65 + ((i * 7 + ci * 11) % 33), evidence: 'Dato sintético de demostración, no verificación documental real.',
      }]));
      const llmScore = simulateScoreRecalculation(activeJob.criteria, criteriaBreakdown, 'LLM');

      newCandidates.push({
        id: candId,
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        phone: `+51 9${Math.floor(10000000 + Math.random() * 89999999)}`,
        currentTitle: tit,
        currentCompany: comp,
        source: 'Lote ficticio de demostración',
        summary: `Perfil normalizado a Markdown desde CV multi-plataforma. Experiencia comprobada en ${tit} en ${comp}.`,
        rawCvText: `# Currículum Vitae — ${fn} ${ln}\n\n## Perfil Profesional\n${tit} en ${comp}.\n\n## Educación & Certificaciones\n- Grado de Maestría o equivalente verificado.\n- Especialización en ${activeJob.department}.\n\n## Experiencia Relevante\n- Trayectoria de más de 6 años liderando proyectos en el sector.`,
        savedInTalentPool: false,
      });

      newApps.push({
        id: appId,
        jobPostingId: activeJob.id,
        candidateId: candId,
        stage: 'postulado',
        llmScore,
        mandatoryRequirementStatus: i % 8 === 0 ? 'sin_verificar' : 'verificado',
        requirementJustification: i % 8 === 0 ? 'Caso ficticio: requisito pendiente de verificación.' : 'Caso ficticio: requisito verificado para probar el flujo.',
        whyScoreNotes: {
          explanation: `Score asignado mediante evaluación demostrativa con ${activeJob.criteriaVersion} sobre Markdown optimizado.`,
          strengths: ['Experiencia en el sector comprobada', 'Buena alineación semántica con syllabus'],
          evidenceSummary: 'Documentación normalizada a Markdown en lote demostrativo.',
        },
        criteriaBreakdown,
        createdAt: now,
        updatedAt: now,
      });
    }

    handleAddBatchCandidates(newCandidates, newApps);
  };

  if (!activeJob) return null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <ActiveJobBanner />

      {/* Cabecera Principal */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-red-subtle)',
              color: 'var(--primary-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 1px var(--primary-red-border)',
              flexShrink: 0,
            }}
          >
            <UploadCloud size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Carga e Ingesta de CV's
              </h1>
              <Badge variant="primary" size="sm">
                Pipeline Multi-Plataforma
              </Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Detección de archivos y validación CSV. OCR y conectores externos pendientes. Los lotes de prueba contienen datos ficticios.
            </p>
          </div>
        </div>

        <Button variant="secondary" size="md" icon={<ArrowRight size={15} />} iconPosition="right" onClick={() => setCurrentView('mejores_candidatos')}>
          Ver candidatos evaluados
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem' }}>
        {/* Panel 1: Ingesta Automatizada y Carga de CV's */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Ingesta y Carga de CV's
              </h2>
              <Badge variant="neutral" size="sm" icon={<FileCode2 size={12} />}>
                OCR pipeline → CSV
              </Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              El flujo previsto convierte CVs a <strong>CSV estructurado</strong>. En esta demo, PDF, Word e imágenes se detectan; el OCR y la evaluación requieren la integración del equipo.
            </p>
          </div>

          {/* Bloque de Acción Principal: Iniciar Simulación de Carga */}
          <div
            style={{
              padding: '1.15rem',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Sparkles size={16} style={{ color: 'var(--primary-red)' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Simulación con perfiles ficticios
                </span>
              </div>
              <Badge variant="purple" size="sm">
                LinkedIn · Bolsa ESAN · Portales
              </Badge>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Genera 6 perfiles ficticios para probar el flujo. No consulta LinkedIn, Bolsa ESAN ni otros portales.
            </p>

            <Button
              variant="primary"
              size="lg"
              icon={isAutoIngesting ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
              disabled={isAutoIngesting || isGenerating || activeJob.status !== 'activa'}
              onClick={handleStartAutoIngest}
              style={{ width: '100%' }}
            >
              {isAutoIngesting ? 'Generando perfiles ficticios...' : "⚡ Iniciar Simulación de Carga de CV's"}
            </Button>

            {/* Barra de progreso de carga automática */}
            {isAutoIngesting && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{autoIngestPhase}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary-red)', fontVariantNumeric: 'tabular-nums' }}>
                    {autoIngestProgress}%
                  </span>
                </div>
                <div
                  style={{
                    height: '6px',
                    backgroundColor: 'var(--border-default)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${autoIngestProgress}%`,
                      backgroundColor: 'var(--primary-red)',
                      transition: 'width 200ms ease',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Separador sutil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
            <span>O cargue archivos de forma manual si dispone de los documentos locales</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          </div>

          {/* Zona de Drop / Input de archivo */}
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); processFiles(e.dataTransfer.files); }}
            style={{
              border: '2px dashed var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-base)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-red-subtle)',
                color: 'var(--primary-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={22} />
            </div>
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                Haga clic para seleccionar o arrastre CV's aquí
              </span>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                PDF, Word (.docx), Markdown (.md), Imágenes o CSV estructurado
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.md,.csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>

          {/* Tarjeta Explicativa del Pipeline */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              <Cpu size={15} style={{ color: 'var(--primary-red)' }} />
              <span>Flujo Técnico de Procesamiento:</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '0.25rem' }}>
              <div>
                <strong>1. Ingesta Multi-Plataforma:</strong> Conectores de portales pendientes de integración. La simulación genera solo perfiles ficticios locales.
              </div>
              <div>
                <strong>2. OCR pipeline → CSV:</strong> OCR pipeline → CSV previsto en el acta. La extracción documental y los motores de matching aún no están conectados.
              </div>
              <div>
                <strong>3. Exportación CSV:</strong> Descargue los expedientes desde <em>Mejores candidatos</em> en formato CSV (UTF-8 con BOM) para revisión del comité.
              </div>
            </div>
          </div>

          {/* Lista de archivos detectados */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Archivos detectados para ingesta ({files.length}):
              </span>
              {files.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <FileText size={17} style={{ color: f.recognized ? 'var(--primary-red)' : 'var(--status-failed-text)', flexShrink: 0, marginTop: '0.1rem' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: f.recognized ? 'var(--text-secondary)' : 'var(--status-failed-text)' }}>
                      {f.statusMessage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vista previa de validación CSV de perfiles */}
          {csvContentPreview && (
            <div
              style={{
                padding: '0.85rem',
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Vista previa de validación CSV ({csvContentPreview.rows.length} filas):
                </span>
                {csvContentPreview.errors.length === 0 ? (
                  <Badge variant="success" size="sm">
                    Estructura válida
                  </Badge>
                ) : (
                  <Badge variant="danger" size="sm">
                    {csvContentPreview.errors.length} errores encontrados
                  </Badge>
                )}
              </div>

              {csvContentPreview.errors.map((err, idx) => (
                <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--status-failed-text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={13} />
                  <span>{err}</span>
                </div>
              ))}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                      {csvContentPreview.headers.map((h, i) => (
                        <th key={i} style={{ padding: '0.35rem 0.5rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvContentPreview.rows.map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {row.map((col, cIdx) => (
                          <td key={cIdx} style={{ padding: '0.35rem 0.5rem', color: 'var(--text-primary)' }}>{col}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Simulador de Lotes de Demostración */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
              <Sparkles size={18} style={{ color: 'var(--primary-red)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Simulador de Lotes de Demostración
              </h2>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Genera candidatos sintéticos procesados en Markdown con puntuaciones LLM para probar el comportamiento en listas grandes, ordenamientos y paginación en esta versión de demostración (<strong>{activeJob.code}</strong>).
            </p>

            {/* Selector de tamaño de lote */}
            <div style={{ marginTop: '1.25rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                Seleccione el volumen del lote a generar:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[25, 100, 500].map((size) => (
                  <button
                    key={size}
                    type="button"
                    disabled={isGenerating || isAutoIngesting}
                    onClick={() => setBatchSize(size as any)}
                    className="focus-ring hover-lift"
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${batchSize === size ? 'var(--primary-red)' : 'var(--border-default)'}`,
                      backgroundColor: batchSize === size ? 'var(--primary-red-subtle)' : 'var(--bg-base)',
                      color: batchSize === size ? 'var(--primary-red)' : 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      boxShadow: batchSize === size ? '0 0 12px rgba(183, 25, 54, 0.2)' : 'none',
                    }}
                  >
                    <span>{size}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      perfiles
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Barra de progreso interactiva si está generando */}
            {isGenerating && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  animation: 'fadeIn 180ms ease-out',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentPhase}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary-red)', fontVariantNumeric: 'tabular-nums' }}>
                    {generationProgress}%
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--border-default)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${generationProgress}%`,
                      background: 'linear-gradient(90deg, var(--primary-red) 0%, #E11D48 100%)',
                      boxShadow: '0 0 8px rgba(183, 25, 54, 0.45)',
                      transition: 'width 200ms ease-out',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
              Condición del simulador: límite de 1.000 por convocatoria para prueba de demostración.
            </span>

            <Button
              variant="primary"
              size="lg"
              icon={<Play size={18} />}
              disabled={isGenerating || isAutoIngesting}
              onClick={handleStartBatchGeneration}
              style={{ width: '100%' }}
            >
              {isGenerating ? 'Generando perfiles...' : `Generar lote de ${batchSize} candidatos`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

