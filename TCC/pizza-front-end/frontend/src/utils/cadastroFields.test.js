import { maskCpf, maskCpfCnpj, maskPhone, validateCpf, validateDecimal, validateEmail, validatePassword } from './cadastroFields';

test('documentos numéricos recebem máscara sem validação de dígito verificador', () => {
  expect(maskCpf('12345678901')).toBe('123.456.789-01');
  expect(maskCpfCnpj('12345678000190')).toBe('12.345.678/0001-90');
  expect(validateCpf('000.000.000-00')).toBe('');
  expect(validateCpf('123')).toBe('Informe os 11 números do CPF.');
});

test('máscaras não truncam valores inesperados ou formatos internacionais e alfanuméricos', () => {
  expect(maskPhone('4499999999')).toBe('(44) 9999-9999');
  expect(maskPhone('44999999999')).toBe('(44) 99999-9999');
  expect(maskPhone('+55 44 99999-9999')).toBe('+55 44 99999-9999');
  expect(maskPhone('fone ramal 22')).toBe('fone ramal 22');
  expect(maskCpf('123456789012')).toBe('123456789012');
  expect(maskCpfCnpj('12ABC34501DE90')).toBe('12ABC34501DE90');
});

test('senha segue mínimo de caracteres e limite real UTF-8 do backend', () => {
  expect(validatePassword('', false)).toBe('');
  expect(validatePassword('        ')).toContain('apenas por espaços');
  expect(validatePassword('1234567')).toContain('8 caracteres');
  expect(validatePassword('é'.repeat(36))).toBe('');
  expect(validatePassword('é'.repeat(37))).toContain('72 bytes');
  expect(validatePassword('🙂'.repeat(18))).toBe('');
  expect(validatePassword('🙂'.repeat(19))).toContain('72 bytes');
});

test('valores respeitam passo de centésimos anterior sem arredondamento silencioso', () => {
  expect(validateDecimal('1.001', 0, 'Quantidade inválida.')).toContain('duas casas');
  expect(validateDecimal('39.90', 0.01, 'Preço inválido.')).toBe('');
  expect(validateDecimal('0', 0, 'Quantidade inválida.')).toBe('');
  expect(validateDecimal('0', 0.01, 'Preço inválido.')).toBe('Preço inválido.');
  expect(validateDecimal('0.29', 0, 'Quantidade inválida.')).toBe('');
  expect(validateDecimal('0.099999', 0, 'Quantidade inválida.', 6)).toBe('');
  expect(validateDecimal('0.0000001', 0, 'Quantidade inválida.', 6)).toContain('seis casas');
});

test('email aceita domínio simples compatível com input email e backend', () => {
  expect(validateEmail('atendente@local', true)).toBe('');
  expect(validateEmail('incompleto', true)).toContain('e-mail válido');
  expect(validateEmail('', false)).toBe('');
});
