export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

export function maskCpf(value) {
  const text = String(value ?? '');
  const digits = onlyDigits(text);
  // Não apagar ou truncar valores inesperados: a validação explica como corrigi-los.
  if (/[a-z]/i.test(text) || digits.length > 11) return text;
  return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\.\d{3})(\d)/, '$1-$2');
}

export function maskCpfCnpj(value) {
  const text = String(value ?? '');
  const digits = onlyDigits(text);
  // Cadastros existentes e documentos alfanuméricos são mantidos sem conversão.
  if (/[a-z]/i.test(text) || digits.length > 14) return text;
  if (digits.length <= 11) return maskCpf(digits);
  return digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\.\d{3})(\d)/, '$1/$2').replace(/(\/\d{4})(\d)/, '$1-$2');
}

export function maskPhone(value) {
  const text = String(value ?? '');
  const digits = onlyDigits(text);
  // Código de país, ramais e formatos legados permanecem editáveis.
  if (text.includes('+') || /[a-z]/i.test(text) || digits.length > 11) return text;
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const local = digits.slice(2);
  const split = local.length > 8 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? `-${local.slice(split)}` : ''}`;
}

export function requiredText(value, label, max) {
  const text = String(value ?? '').trim();
  if (!text) return `Informe ${label}.`;
  if (max && text.length > max) return `Use no máximo ${max} caracteres.`;
  return '';
}

export function validateEmail(value, required = false) {
  const text = String(value ?? '').trim();
  if (!text) return required ? 'Informe o e-mail.' : '';
  if (text.length > 100) return 'Use no máximo 100 caracteres.';
  return /^[^\s@]+@[^\s@]+$/.test(text) ? '' : 'Informe um e-mail válido, como nome@empresa.com.';
}

export function validateCpf(value) {
  return onlyDigits(value).length === 11 && !/[a-z]/i.test(value) ? '' : 'Informe os 11 números do CPF.';
}

export function validatePhone(value, required = false) {
  const text = String(value ?? '').trim();
  if (!text) return required ? 'Informe o telefone.' : '';
  if (text.length > 20) return 'Use no máximo 20 caracteres no telefone.';
  return '';
}

export function validatePassword(value, required = true) {
  if (!value && !required) return '';
  if (!String(value ?? '').trim()) return 'Informe uma senha que não seja composta apenas por espaços.';
  if (!value || value.length < 8) return 'Use uma senha com pelo menos 8 caracteres.';
  if (new Blob([value]).size > 72) return 'A senha ultrapassa o limite de 72 bytes. Reduza o tamanho, principalmente se usar acentos ou emojis.';
  return '';
}

/** Preços mantêm centavos; insumos podem usar seis casas, sem arredondar o envio. */
export function validateDecimal(value, minimum, message, decimalPlaces = 2) {
  const number = Number(value);
  if (String(value ?? '').trim() === '' || !Number.isFinite(number) || number < minimum) return message;
  const scaled = number * (10 ** decimalPlaces);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (Number.isFinite(scaled) && Math.abs(scaled - Math.round(scaled)) > tolerance) return decimalPlaces === 6 ? 'Use no máximo seis casas decimais.' : 'Use no máximo duas casas decimais.';
  return '';
}

export function firstInvalidField(form, errors) {
  const name = Object.keys(errors).find((key) => errors[key]);
  if (name) form?.elements.namedItem(name)?.focus?.();
}
