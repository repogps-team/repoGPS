/**
 * Pure unit tests for ms-expedientes internal functions
 * These tests do NOT require DB mocking or supertest.
 */

// Import the app just to access __unit exports directly
const app = require('../index');
const { __unit } = app;

describe('isAllowedFile()', () => {
  const makeFile = (name, mime) => ({
    originalname: name,
    mimetype: mime,
  });

  test('permite archivos PDF', () => {
    const result = __unit.isAllowedFile(makeFile('documento.pdf', 'application/pdf'));
    expect(result).toEqual({ allowed: true });
  });

  test('permite archivos DWG', () => {
    const result = __unit.isAllowedFile(makeFile('plano.dwg', 'image/vnd.dwg'));
    expect(result).toEqual({ allowed: true });
  });

  test('permite archivos DXF', () => {
    const result = __unit.isAllowedFile(makeFile('cambio.dxf', 'application/dxf'));
    expect(result).toEqual({ allowed: true });
  });

  test('permite imágenes JPG con MIME image/jpeg', () => {
    const result = __unit.isAllowedFile(makeFile('foto.jpg', 'image/jpeg'));
    expect(result).toEqual({ allowed: true });
  });

  test('permite imágenes PNG genérico (image/*)', () => {
    const result = __unit.isAllowedFile(makeFile('imagen.png', 'image/png'));
    expect(result).toEqual({ allowed: true });
  });

  test('permite archivos Excel .xlsx', () => {
    const result = __unit.isAllowedFile(
      makeFile('presupuesto.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    );
    expect(result).toEqual({ allowed: true });
  });

  test('rechaza extensión .exe', () => {
    const result = __unit.isAllowedFile(makeFile('virus.exe', 'application/x-msdownload'));
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('Extensión no permitida');
  });

  test('rechaza MIME type no permitido (ext válida, MIME inválido)', () => {
    // PDF has valid extension but invalid MIME
    const result = __unit.isAllowedFile(makeFile('doc.pdf', 'application/octet-stream'));
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('Tipo de archivo no permitido');
  });

  test('es case-insensitive con extensiones', () => {
    const result = __unit.isAllowedFile(makeFile('PLANO.PDF', 'application/pdf'));
    expect(result).toEqual({ allowed: true });
  });
});

describe('normalizarTipoTarea()', () => {
  test('normaliza "revision" a minúscula', () => {
    expect(__unit.normalizarTipoTarea('Revision')).toBe('revision');
  });

  test('normaliza "APROBACION" a minúscula', () => {
    expect(__unit.normalizarTipoTarea('APROBACION')).toBe('aprobacion');
  });

  test('normaliza "VISACION" a minúscula', () => {
    expect(__unit.normalizarTipoTarea('VISACION')).toBe('visacion');
  });

  test('retorna null para tipo inválido', () => {
    expect(__unit.normalizarTipoTarea('invalid')).toBeNull();
  });

  test('retorna null para tipo vacío', () => {
    expect(__unit.normalizarTipoTarea('')).toBeNull();
  });

  test('retorna null para undefined', () => {
    expect(__unit.normalizarTipoTarea(undefined)).toBeNull();
  });
});

describe('normalizarTipoEtapa()', () => {
  test('normaliza "inicio"', () => {
    expect(__unit.normalizarTipoEtapa('Inicio')).toBe('inicio');
  });

  test('normaliza "DESARROLLO"', () => {
    expect(__unit.normalizarTipoEtapa('DESARROLLO')).toBe('desarrollo');
  });

  test('normaliza "Final"', () => {
    expect(__unit.normalizarTipoEtapa('Final')).toBe('final');
  });

  test('retorna null para tipo inválido', () => {
    expect(__unit.normalizarTipoEtapa('otro')).toBeNull();
  });

  test('retorna null para vacío', () => {
    expect(__unit.normalizarTipoEtapa('')).toBeNull();
  });
});

describe('isMissingColumnError()', () => {
  test('detecta error de columna faltante', () => {
    const err = new Error('column t.etapa_id does not exist');
    expect(__unit.isMissingColumnError(err, 'etapa_id')).toBe(true);
  });

  test('detecta error sin prefijo t.', () => {
    const err = new Error('column etapa_id does not exist');
    expect(__unit.isMissingColumnError(err, 'etapa_id')).toBe(true);
  });

  test('retorna false para otro error', () => {
    const err = new Error('syntax error at or near "SELECT"');
    expect(__unit.isMissingColumnError(err, 'etapa_id')).toBe(false);
  });

  test('retorna false para null', () => {
    expect(__unit.isMissingColumnError(null, 'etapa_id')).toBe(false);
  });
});

describe('ALLOWED_EXTENSIONS Set', () => {
  test('incluye extensiones de construcción comunes', () => {
    expect(__unit.ALLOWED_EXTENSIONS.has('.pdf')).toBe(true);
    expect(__unit.ALLOWED_EXTENSIONS.has('.dwg')).toBe(true);
    expect(__unit.ALLOWED_EXTENSIONS.has('.rvt')).toBe(true);
    expect(__unit.ALLOWED_EXTENSIONS.has('.ifc')).toBe(true);
    expect(__unit.ALLOWED_EXTENSIONS.has('.skp')).toBe(true);
  });

  test('incluye formatos de office', () => {
    expect(__unit.ALLOWED_EXTENSIONS.has('.xlsx')).toBe(true);
    expect(__unit.ALLOWED_EXTENSIONS.has('.docx')).toBe(true);
    expect(__unit.ALLOWED_EXTENSIONS.has('.csv')).toBe(true);
  });
});
