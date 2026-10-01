import { STAGE_LABELS, candidateScore } from './domain.js';

export function catalogCSVRows(templates) {
  return [['ID','Perfil','Categoría','Requisito'], ...templates.map(t=>[t.id,t.title,t.roleType,t.knockoutRule])];
}

export function candidateCSVRows(job, candidates) {
  return [['ID','Candidato','Perfil','Categoría','Requisito','Convocatoria','Puntaje según Machine Learning','Puntaje según LLM (embeddings)','Ordenado según','Etapa','Fuente','Explicación','Estado del mensaje'],
    ...candidates.map(c=>[c.id,c.name,job.title,job.roleType,job.knockoutRule,job.id,candidateScore(c,'ml'),candidateScore(c,'llm'),job.rankingModel === 'llm' ? 'LLM (embeddings)' : 'Machine Learning',STAGE_LABELS[c.stage],c.source,c.narrative.selectionReason,c.messageDraft?.status || 'Sin preparar'])];
}

export function comparisonCSVRows(job, candidates) {
  return [['Convocatoria','Puesto','Posición en esta comparación','Candidato','Etapa','Puntaje ML','Puntaje LLM','Ordenado según','Requisitos obligatorios','Fortalezas','Por qué este perfil',...job.weights.map(w=>w.label)],
    ...candidates.map((c,index)=>[job.id,job.title,index+1,c.name,STAGE_LABELS[c.stage],candidateScore(c,'ml'),candidateScore(c,'llm'),job.rankingModel === 'llm' ? 'LLM (embeddings)' : 'Machine Learning',c.knockoutMet===true?'Verificados':c.knockoutMet===false?'No cumple':'Sin verificar',c.narrative.strengths.join(' · '),c.narrative.selectionReason,...job.weights.map(w=>{ const evidence=c.weights.find(row=>row.label===w.label); return Number.isFinite(evidence?.scoreObtained)&&evidence.maxScore>0?`${Math.round(evidence.scoreObtained/evidence.maxScore*100)} %`:'Sin evidencia'; })])];
}

export function serializeCSV(rows) {
  const cell = value => {
    const raw = String(value ?? '');
    const safe = /^[\s]*[=+\-@]/.test(raw) || /^[\t\r]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replace(/"/g,'""') + '"';
  };
  return '\ufeff' + rows.map(row=>row.map(cell).join(';')).join('\r\n');
}

// CSV catalog preview only. No document extraction or candidate evaluation.
export function parseCatalogCSV(contents) {
  const source = String(contents).replace(/^\ufeff/,'');
  const delimiter = source.split(/\r?\n/)[0].includes(';') ? ';' : ',';
  const rows = []; let row = [], value = '', quoted = false;
  for (let i=0;i<source.length;i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i+1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === delimiter || char === '\n' || char === '\r')) {
      row.push(value); value = '';
      if (char !== delimiter) { if (row.some(c=>c.trim())) rows.push(row); row=[]; if (char==='\r' && source[i+1]==='\n') i++; }
    } else value += char;
  }
  if (quoted) throw new Error('El CSV tiene una celda con comillas sin cerrar.');
  row.push(value); if(row.some(c=>c.trim()))rows.push(row);
  const expected = ['id','perfil','categoría','requisito'];
  if (rows.length < 2 || expected.some((h,i)=>rows[0][i]?.trim().toLowerCase()!==h)) throw new Error('Usa las columnas ID, Perfil, Categoría y Requisito, como en el CSV de ejemplo.');
  const ids = new Set();
  return rows.slice(1).map((r,i)=>{
    if (r.length!==4 || !r[0].trim() || !r[1].trim() || ids.has(r[0].trim())) throw new Error(`Revisa el perfil de la fila ${i+2}: debe tener cuatro columnas y un ID único.`);
    ids.add(r[0].trim());
    return { id:r[0].trim(), title:r[1].trim(), roleType:r[2].trim(), knockoutRule:r[3].trim() };
  });
}

export function detectFileFormat(file) {
  const extension = String(file.name || '').split('.').at(-1).toLowerCase();
  const types = { pdf:'PDF', doc:'Word', docx:'Word', csv:'CSV', png:'Imagen', jpg:'Imagen', jpeg:'Imagen' };
  return types[extension] || 'Formato no reconocido';
}
