import { comandaNumber, comandaReference } from './formatters';

test('número curto usa a sequência diária sem cortar dígitos', () => {
  expect(comandaNumber({ numero: 1760834260, numeroDiario: 3 })).toBe('003');
  expect(comandaNumber({ numeroDiario: 1000 })).toBe('1000');
  expect(comandaNumber({ numero: 10 })).toBe('10');
});
test('data de abertura distingue números iguais em dias diferentes', () => {
  expect(comandaReference({ numeroDiario: 1, dataNumeracao: '2026-10-11' })).toBe('11/10/2026 · #001');
  expect(comandaReference({ numeroDiario: 1, dataHoraAbertura: '2026-10-12T00:01:00' })).toBe('12/10/2026 · #001');
});
