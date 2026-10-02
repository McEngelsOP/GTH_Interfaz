import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
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

  // Carga automática multi-plataforma
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
    if (!activeJob) return;

    setIsAutoIngesting(true);
    setAutoIngestProgress(0);
    setAutoIngestPhase('Conectando con APIs de LinkedIn Talent y Bolsa Laboral ESAN...');

    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      if (p <= 30) {
        setAutoIngestPhase('Sincronizando expedientes y extrayendo 6 CVs postulados...');
        setAutoIngestProgress(p);
      } else if (p <= 60) {
        setAutoIngestPhase('Normalizando currículos a formato Markdown (.md) estructurado...');
        setAutoIngestProgress(p);
      } else if (p <= 85) {
        setAutoIngestPhase('Extrayendo entidades clave y calculando puntuaciones semánticas...');
        setAutoIngestProgress(p);
      } else if (p >= 100) {
        clearInterval(interval);
        setAutoIngestProgress(100);
        setAutoIngestPhase('¡Carga automática completada!');

        setTimeout(() => {
          finalizeBatchGeneration(6);
          setIsAutoIngesting(false);
          showToast(`Carga automática completada: 6 CVs extraídos de LinkedIn y Bolsa ESAN y normalizados a Markdown.`, 'success');
        }, 500);
      }
    }, 280);
  };

  // Manejo de carga de archivos locales manuales
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded) return;

    const list: UploadedFilePreview[] = [];

    Array.from(uploaded).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let recognized = false;
      let statusMessage = '';

      if (ext === 'md') {
        recognized = true;
        statusMessage = 'Formato Markdown directo. Estructura optimizada para inferencia sin consumo excesivo de tokens.';
      } else if (ext === 'pdf') {
        recognized = true;
        statusMessage = 'PDF detectado. Conversión y normalización interna a Markdown estructurado en cola.';
      } else if (ext === 'doc' || ext === 'docx') {
        recognized = true;
        statusMessage = 'Documento Word detectado. Extracción de entidades y conversión a Markdown en cola.';
      } else if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
        recognized = true;
        statusMessage = 'Imagen detectada. OCR para transcripción a Markdown pendiente de procesamiento.';
      } else if (ext === 'csv') {
        recognized = true;
        statusMessage = 'Archivo CSV tabular detectado. Procesando catálogo de candidatos...';

        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          parseAndValidateCSV(text);
        };
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

  // Validador de CSV de catálogo (ID; Perfil; Categoría; Requisito)
  const parseAndValidateCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const expectedHeaders = ['ID', 'Perfil', 'Categoría', 'Requisito'];
    const errors: string[] = [];

    expectedHeaders.forEach((expected) => {
      if (!headers.some((h) => h.toLowerCase() === expected.toLowerCase())) {
        errors.push(`Columna faltante requerida: "${expected}"`);
      }
    });

    const rows: string[][] = [];
    const seenIds = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 4) {
        const id = cols[0];
        if (seenIds.has(id)) {
          errors.push(`Fila ${i + 1}: Identificador duplicado "${id}"`);
        } else {
          seenIds.add(id);
        }
        rows.push(cols.slice(0, 4));
      } else if (cols.length > 1) {
        errors.push(`Fila ${i + 1}: Número insuficiente de columnas (esperadas 4, encontradas ${cols.length})`);
      }
    }

    setCsvContentPreview({ headers, rows: rows.slice(0, 5), errors });
  };

  // Generador de lotes demostrativos (25, 100, 500)
  const handleStartBatchGeneration = () => {
    if (!activeJob) return;

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
        setCurrentPhase('Validando reglas deterministas ML y requisitos de convocatoria...');
        setGenerationProgress(p);
      } else if (p >= 100) {
        clearInterval(interval);
        setGenerationProgress(100);
        setCurrentPhase('¡Lote normalizado generado exitosamente!');

        setTimeout(() => {
          finalizeBatchGeneration(batchSize);
          setIsGenerating(false);
          showToast(`Se incorporaron ${batchSize} candidatos de prueba a "${activeJob.title}".`, 'success');
        }, 500);
      }
    }, 280);
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
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      const comp = companies[Math.floor(Math.random() * companies.length)];
      const tit = titles[Math.floor(Math.random() * titles.length)];

      const candId = `cand-gen-${Date.now()}-${i}`;
      const appId = `app-gen-${Date.now()}-${i}`;

      const baseScore = Math.floor(65 + Math.random() * 32);
      const mlScore = Math.min(100, Math.max(50, baseScore + Math.floor(Math.random() * 7 - 3)));
      const llmScore = Math.min(100, Math.max(50, baseScore + Math.floor(Math.random() * 7 - 3)));

      newCandidates.push({
        id: candId,
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        phone: `+51 9${Math.floor(10000000 + Math.random() * 89999999)}`,
        currentTitle: tit,
        currentCompany: comp,
        source: ['Bolsa ESAN', 'LinkedIn Talent', 'Portal Universitario', 'Referencia Académica'][i % 4],
        summary: `Perfil normalizado a Markdown desde CV multi-plataforma. Experiencia comprobada en ${tit} en ${comp}.`,
        rawCvText: `# Currículum Vitae — ${fn} ${ln}\n\n## Perfil Profesional\n${tit} en ${comp}.\n\n## Educación & Certificaciones\n- Grado de Maestría o equivalente verificado.\n- Especialización en ${activeJob.department}.\n\n## Experiencia Relevante\n- Trayectoria de más de 6 años liderando proyectos en el sector.`,
        savedInTalentPool: false,
      });

      newApps.push({
        id: appId,
        jobPostingId: activeJob.id,
        candidateId: candId,
        stage: 'postulado',
        mlScore,
        llmScore,
        mandatoryRequirementStatus: i % 8 === 0 ? 'sin_verificar' : 'verificado',
        requirementJustification: 'Extracción y validación automática de requisitos desde CV normalizado en Markdown.',
        whyScoreNotes: {
          explanation: `Score asignado mediante evaluación demostrativa con ${activeJob.criteriaVersion} sobre Markdown optimizado.`,
          strengths: ['Experiencia en el sector comprobada', 'Buena alineación semántica con syllabus'],
          evidenceSummary: 'Documentación normalizada a Markdown en lote demostrativo.',
        },
        criteriaBreakdown: {},
        createdAt: now,
        updatedAt: now,
      });
    }

    handleAddBatchCandidates(newCandidates, newApps);
  };

  if (!activeJob) return null;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
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
              Extracción automatizada multi-plataforma y procesamiento a Markdown para inferencia óptima. Exportable a CSV desde el Banco de Talento.
            </p>
          </div>
        </div>

        <Button variant="secondary" size="md" icon={<ArrowRight size={15} />} iconPosition="right" onClick={() => setCurrentView('mejores_candidatos')}>
          Ver candidatos evaluados
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
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
                Conversión a Markdown
              </Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Los CVs se extraen automáticamente de múltiples bolsas y plataformas de empleo, procesándose internamente a formato <strong>Markdown estructurado</strong> para optimizar la velocidad y precisión del modelo de lenguaje.
            </p>
          </div>

          {/* Bloque de Acción Principal: Iniciar Carga Automática */}
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
                  Extracción Automática de Plataformas
                </span>
              </div>
              <Badge variant="purple" size="sm">
                LinkedIn · Bolsa ESAN · Portales
              </Badge>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Ejecuta el conector institucional para sincronizar automáticamente los nuevos CVs postulados a esta convocatoria, convirtiéndolos en Markdown para evaluación en cliente.
            </p>

            <Button
              variant="primary"
              size="lg"
              icon={isAutoIngesting ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
              disabled={isAutoIngesting || isGenerating}
              onClick={handleStartAutoIngest}
              style={{ width: '100%' }}
            >
              {isAutoIngesting ? 'Extrayendo y normalizando CVs a Markdown...' : "⚡ Iniciar Carga Automática de CV's"}
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
                <strong>1. Ingesta Multi-Plataforma:</strong> Captura automatizada de expedientes desde LinkedIn Talent, Bolsa ESAN y portales de convocatoria.
              </div>
              <div>
                <strong>2. Normalización a Markdown:</strong> Cada currículum se convierte a Markdown (`.md`) para eliminar ruido visual y permitir una evaluación semántica por tokens ultrarrápida.
              </div>
              <div>
                <strong>3. Exportación CSV en Banco de Talento:</strong> Los expedientes consolidados quedan archivados en el <em>Banco de Talento</em>, donde pueden descargarse en formato CSV (UTF-8 con BOM) para auditoría o comités.
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
              Genera candidatos sintéticos procesados en Markdown con puntuaciones ML y LLM para probar el comportamiento en listas grandes, ordenamientos y paginación en esta versión de demostración (<strong>{activeJob.code}</strong>).
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
                    className="focus-ring"
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
                      transition: 'all var(--transition-fast)',
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
                      backgroundColor: 'var(--primary-red)',
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
