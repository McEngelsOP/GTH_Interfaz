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
  CheckCircle2,
  Sparkles,
  Play,
  XCircle,
  FileCheck2,
  Info,
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

  // Generador de lotes ficticios (25, 100, 500)
  const [batchSize, setBatchSize] = useState<25 | 100 | 500>(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');

  // Manejo de carga de archivos reales locales
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded) return;

    const list: UploadedFilePreview[] = [];

    Array.from(uploaded).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let recognized = false;
      let statusMessage = '';

      if (ext === 'pdf') {
        recognized = true;
        statusMessage = 'PDF detectado. Conversión y lectura OCR pendiente de conexión con servidor.';
      } else if (ext === 'doc' || ext === 'docx') {
        recognized = true;
        statusMessage = 'Documento Word detectado. Extracción estructurada pendiente de conexión.';
      } else if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
        recognized = true;
        statusMessage = 'Imagen detectada. OCR de CV pendiente de habilitación.';
      } else if (ext === 'csv') {
        recognized = true;
        statusMessage = 'Archivo CSV tabular detectado. Procesando estructura...';

        // Leer CSV localmente para validar
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          parseAndValidateCSV(text);
        };
        reader.readAsText(file, 'UTF-8');
      } else {
        recognized = false;
        statusMessage = `Formato .${ext} no admitido. Formatos válidos: PDF, DOC, DOCX, PNG, JPG, CSV.`;
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

    // Detectar separador (; o ,)
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const expectedHeaders = ['ID', 'Perfil', 'Categoría', 'Requisito'];
    const errors: string[] = [];

    // Validar cabeceras
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

  // Generador de lotes ficticios (25, 100, 500) para prueba de volumen
  const handleStartBatchGeneration = () => {
    if (!activeJob) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentPhase('Inicializando lote de perfiles sintéticos...');

    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      if (p <= 30) {
        setCurrentPhase('Extrayendo CVs sintéticos y normalizando datos...');
        setGenerationProgress(p);
      } else if (p <= 60) {
        setCurrentPhase('Calculando similitud semántica LLM contra syllabus del puesto...');
        setGenerationProgress(p);
      } else if (p <= 85) {
        setCurrentPhase('Validando reglas deterministas ML y requisitos SUNEDU...');
        setGenerationProgress(p);
      } else if (p >= 100) {
        clearInterval(interval);
        setGenerationProgress(100);
        setCurrentPhase('Finalizando indexación...');

        setTimeout(() => {
          generateAndInjectBatch(batchSize);
          setIsGenerating(false);
        }, 300);
      }
    }, 200);
  };

  const generateAndInjectBatch = (count: number) => {
    if (!activeJob) return;

    const firstNames = ['Alejandro', 'Brenda', 'César', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Iván', 'Jimena', 'Luis', 'Marcela', 'Nicolás', 'Olga', 'Pedro', 'Renata'];
    const lastNames = ['Vargas', 'Morales', 'Paredes', 'Castillo', 'Flores', 'Gutiérrez', 'Rojas', 'Espinoza', 'Silva', 'Campos', 'Salazar', 'Navarro', 'Cordero', 'Peña'];
    const titles = ['Senior Engineer', 'Docente Investigador', 'Lead Architect', 'Consultor Senior', 'Especialista en Operaciones', 'Docente Titular'];
    const companies = ['Telefónica', 'BCP', 'Interbank', 'Universidad Nacional', 'LATAM Airlines', 'Alicorp', 'Auna'];

    const newCandidates: Candidate[] = [];
    const newApps: Application[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const candId = `cand-batch-${Date.now()}-${i}`;
      const appId = `app-batch-${Date.now()}-${i}`;
      const name = `${firstNames[i % firstNames.length]} ${lastNames[(i + 3) % lastNames.length]}`;
      const currentTitle = titles[i % titles.length];
      const currentCompany = companies[i % companies.length];

      // Scores independientes generados de forma realista (70 - 96)
      const mlScore = 70 + Math.floor(Math.random() * 27);
      const llmScore = 68 + Math.floor(Math.random() * 29);

      newCandidates.push({
        id: candId,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@ejemplo-batch.pe`,
        phone: `+51 9${Math.floor(10000000 + Math.random() * 90000000)}`,
        currentTitle,
        currentCompany,
        source: 'Generador de Demostración',
        summary: `Perfil de prueba generado para verificación de volumen en ${activeJob.title}.`,
        rawCvText: `CV estructurado de demostración generado para ${name}.`,
        savedInTalentPool: false,
      });

      newApps.push({
        id: appId,
        jobPostingId: activeJob.id,
        candidateId: candId,
        stage: 'postulado',
        mlScore,
        llmScore,
        mandatoryRequirementStatus: i % 7 === 0 ? 'sin_verificar' : 'verificado',
        requirementJustification: 'Validación automatizada por lote de prueba.',
        whyScoreNotes: {
          explanation: `Score asignado mediante evaluación demostrativa con ${activeJob.criteriaVersion}.`,
          strengths: ['Experiencia en el sector comprobada', 'Buena alineación con syllabus'],
          evidenceSummary: 'Documentación generada en lote.',
        },
        criteriaBreakdown: {},
        createdAt: now,
        updatedAt: now,
      });
    }

    handleAddBatchCandidates(newCandidates, newApps);
    showToast(`Se crearon ${count} candidatos de demostración en "${activeJob.title}".`, 'success');
  };

  if (!activeJob) return null;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <ActiveJobBanner />

      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem',
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
            }}
          >
            <UploadCloud size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Agregar Archivos y Generación de Lotes
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Carga y validación de documentos (CVs, CSVs) y generador de lotes para pruebas de volumen en {activeJob.code}.
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={() => setCurrentView('mejores_candidatos')}>
          Ver candidatos del puesto
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Panel 1: Carga y Validación de Archivos Locales */}
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
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Carga y Reconocimiento de Archivos
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Formatos aceptados: PDF, Word (.doc, .docx), imágenes (.png, .jpg) y catálogos en CSV.
            </p>
          </div>

          {/* Zona de Drop / Input de archivo */}
          <label
            style={{
              border: '2px dashed var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-base)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.65rem',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            <UploadCloud size={38} style={{ color: 'var(--primary-red)' }} />
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                Haga clic para seleccionar o arrastre archivos aquí
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                PDF, Word, Imágenes o CSV estructurado
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>

          {/* Aviso transparente de OCR pendiente (Sección 9) */}
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            <Info size={15} style={{ color: 'var(--text-muted)', display: 'inline', marginRight: '0.35rem' }} />
            <strong>Aviso de demostración:</strong> Reconocer un archivo no significa haber leído su CV. En PDF,
            Word e imágenes, la lectura y conversión de documentos está pendiente de conexión con el servidor de OCR.
          </div>

          {/* Lista de archivos cargados */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Archivos detectados ({files.length}):
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
                  <FileText size={17} style={{ color: f.recognized ? 'var(--primary-red)' : '#DC2626', flexShrink: 0, marginTop: '0.1rem' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: f.recognized ? 'var(--text-secondary)' : '#DC2626' }}>
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
                <div key={idx} style={{ fontSize: '0.75rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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

        {/* Panel 2: Generador de Lotes Ficticios para Pruebas de Volumen */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--primary-red-border)',
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
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Generador de Lotes de Demostración
              </h2>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Genera candidatos ficticios evaluados con ML y LLM para probar listas grandes, ordenamientos y
              paginación en la convocatoria activa (<strong>{activeJob.code}</strong>).
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
                    disabled={isGenerating}
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
                  <span style={{ fontWeight: 700, color: 'var(--primary-red)' }}>{generationProgress}%</span>
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
              Condición del generador: límite de 1.000 por convocatoria para prueba de demostración.
            </span>

            <Button
              variant="primary"
              size="lg"
              icon={<Play size={18} />}
              disabled={isGenerating}
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
