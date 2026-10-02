// CSV con comillas escapadas, saltos de línea internos y BOM de Excel.
export function parseCSV(text: string): { records: string[][]; errors: string[] } {
  const source = text.replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const records: string[][] = [], errors: string[] = [];
  let row: string[] = [], cell = '', quoted = false;
  const finishRow = () => { row.push(cell.trim()); if (row.some((v) => v !== '')) records.push(row); row = []; cell = ''; };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { finishRow(); if (char === '\r' && source[i + 1] === '\n') i++; }
    else cell += char;
  }
  finishRow();
  if (quoted) errors.push('El archivo tiene una celda con comillas sin cerrar.');
  if (!records.length) errors.push('El archivo CSV está vacío.');
  return { records, errors };
}

export function validateProfileCatalogCSV(text: string): { headers: string[]; rows: string[][]; errors: string[] } {
  const { records, errors } = parseCSV(text);
  const headers = records[0] || [];
  const expected = ['ID', 'Perfil', 'Categoría', 'Requisito'];
  const indexes = expected.map((name) => headers.findIndex((h) => h.toLocaleLowerCase() === name.toLocaleLowerCase()));
  indexes.forEach((index, i) => { if (index < 0) errors.push(`Columna faltante requerida: "${expected[i]}"`); });
  const seenIds = new Set<string>();
  const rows: string[][] = [];
  for (const [index, record] of records.slice(1).entries()) {
    if (record.length !== headers.length) { errors.push(`Registro ${index + 2}: número de columnas distinto al encabezado.`); continue; }
    if (indexes.some((i) => i < 0)) continue;
    const values = indexes.map((i) => record[i]);
    if (!values[0]) errors.push(`Registro ${index + 2}: identificador vacío.`);
    else if (seenIds.has(values[0])) errors.push(`Registro ${index + 2}: identificador duplicado "${values[0]}".`);
    seenIds.add(values[0]); rows.push(values);
  }
  return { headers: expected, rows: rows.slice(0, 5), errors };
}
