package com.integrador.api.pizza.service;

// Importações corrigidas para o seu padrão de projeto
import com.integrador.api.pizza.enums.StatusConta;
import com.integrador.api.pizza.model.ContaAPagar;
import com.integrador.api.pizza.model.Fornecedor;
import com.integrador.api.pizza.dto.ContaInputDTO; // Importe o DTO correto aqui
import com.integrador.api.pizza.dto.ContaAtualizacaoDTO;
import com.integrador.api.pizza.repository.ContasApagarRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


    @Service
    public class ContaService {

        @Autowired
        private ContasApagarRepository repository;

        @Autowired
        private FornecedorService fornecedorService;

        @Transactional
        public List<ContaAPagar> criarContas(ContaInputDTO dto) {
            if (dto.getParcelas() == null || dto.getParcelas() < 1 || dto.getParcelas() > 120
                    || dto.getValorTotal() == null || dto.getValorTotal().scale() > 2
                    || dto.getValorTotal().compareTo(new BigDecimal("0.01").multiply(BigDecimal.valueOf(dto.getParcelas()))) < 0) {
                throw new IllegalArgumentException("Informe um valor válido e de 1 a 120 parcelas de pelo menos R$ 0,01.");
            }
            List<ContaAPagar> novasContas = new ArrayList<>();
            String grupoId = UUID.randomUUID().toString();
            Fornecedor fornecedor = fornecedorService.buscarPorId(dto.getFornecedorId());

            BigDecimal valorParcela = dto.getValorTotal().divide(
                    BigDecimal.valueOf(dto.getParcelas()), 2, RoundingMode.DOWN
            );

            for (int i = 0; i < dto.getParcelas(); i++) {
                ContaAPagar conta = new ContaAPagar();
                conta.setDescricao(dto.getParcelas() > 1 ?
                        dto.getDescricao() + " (" + (i + 1) + "/" + dto.getParcelas() + ")" :
                        dto.getDescricao());

                // A última parcela absorve os centavos restantes: a soma preserva o valor informado.
                conta.setValor(i == dto.getParcelas() - 1
                        ? dto.getValorTotal().subtract(valorParcela.multiply(BigDecimal.valueOf(i)))
                        : valorParcela);
                conta.setDataVencimento(dto.getPrimeiroVencimento().plusMonths(i));
                conta.setStatus(StatusConta.PENDENTE);
                conta.setFornecedor(fornecedor);
                conta.setGrupoId(dto.getParcelas() > 1 ? grupoId : null);

                novasContas.add(conta);
            }
            return repository.saveAll(novasContas);
        }

        @Transactional(readOnly = true)
        public List<ContaAPagar> buscarComFiltros(Long fornecedorId, String mesAno) {
            if (mesAno != null && !mesAno.matches("\\d{4}-(0[1-9]|1[0-2])")) {
                throw new IllegalArgumentException("Informe o mês no formato AAAA-MM.");
            }
            // Cópias para exibição: a consulta jamais salva sobre um pagamento concorrente.
            return repository.buscarComFiltros(fornecedorId, mesAno).stream().map(conta -> {
                ContaAPagar exibida = new ContaAPagar();
                exibida.setId(conta.getId());
                exibida.setDescricao(conta.getDescricao());
                exibida.setValor(conta.getValor());
                exibida.setDataVencimento(conta.getDataVencimento());
                exibida.setDataPagamento(conta.getDataPagamento());
                exibida.setFornecedor(conta.getFornecedor());
                exibida.setGrupoId(conta.getGrupoId());
                exibida.setStatus(conta.getStatus() != StatusConta.PAGA && conta.getDataVencimento() != null
                        && conta.getDataVencimento().isBefore(LocalDate.now()) ? StatusConta.VENCIDA : conta.getStatus());
                return exibida;
            }).toList();
        }

        @Transactional
        public ContaAPagar atualizar(Long id, ContaAtualizacaoDTO dto) {
            ContaAPagar conta = buscarContaBloqueada(id);
            if (conta.getStatus() == StatusConta.PAGA) {
                throw new IllegalArgumentException("Uma conta paga não pode ser alterada.");
            }
            conta.setDescricao(dto.getDescricao());
            conta.setValor(dto.getValor());
            conta.setDataVencimento(dto.getDataVencimento());
            conta.setStatus(dto.getDataVencimento() != null && dto.getDataVencimento().isBefore(LocalDate.now())
                    ? StatusConta.VENCIDA
                    : StatusConta.PENDENTE);
            return repository.save(conta);
        }

        @Transactional
        public ContaAPagar pagar(Long id) {
            ContaAPagar conta = buscarContaBloqueada(id);
            if (conta.getStatus() == StatusConta.PAGA) {
                return conta;
            }
            conta.setStatus(StatusConta.PAGA);
            conta.setDataPagamento(LocalDate.now());
            return repository.save(conta);
        }

        @Transactional
        public void excluir(Long id) {
            List<ContaAPagar> grupo = repository.buscarGrupoParaAtualizar(id);
            if (grupo.stream().noneMatch(conta -> conta.getId().equals(id))) {
                throw new IllegalArgumentException("Conta não encontrada.");
            }
            if (grupo.stream().anyMatch(conta -> conta.getId().equals(id) && conta.getStatus() == StatusConta.PAGA)) {
                throw new IllegalArgumentException("Não é permitido excluir uma conta já paga.");
            }
            // Pagamentos permanecem no histórico mesmo ao excluir as parcelas ainda em aberto.
            repository.deleteAll(grupo.stream().filter(conta -> conta.getStatus() != StatusConta.PAGA).toList());
        }

        private ContaAPagar buscarContaBloqueada(Long id) {
            return repository.buscarGrupoParaAtualizar(id).stream().filter(conta -> conta.getId().equals(id))
                    .findFirst().orElseThrow(() -> new IllegalArgumentException("Conta não encontrada."));
        }
    }
