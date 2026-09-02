import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./api/api', () => ({
  __esModule: true,
  default: {
    get: () => Promise.reject(new Error('demo')),
  },
}));

test('renderiza a navegação e o dashboard principal', async () => {
  window.scrollTo = jest.fn();
  render(<App />);
  expect(screen.getByText('Aurora Pizza')).toBeInTheDocument();
  expect(await screen.findByText('Boa tarde, Davi.')).toBeInTheDocument();
  expect(screen.getByText('Faturamento de hoje')).toBeInTheDocument();
});
