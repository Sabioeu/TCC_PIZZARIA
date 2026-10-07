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

        public List<ContaAPagar> criarContas(ContaInputDTO dto) {
            List<ContaAPagar> novasContas = new ArrayList<>();
            String grupoId = UUID.randomUUID().toString();
            Fornecedor fornecedor = fornecedorService.buscarPorId(dto.getFornecedorId());

            BigDecimal valorParcela = dto.getValorTotal().divide(
                    BigDecimal.valueOf(dto.getParcelas()), 2, RoundingMode.HALF_UP
            );

            for (int i = 0; i < dto.getParcelas(); i++) {
                ContaAPagar conta = new ContaAPagar();
                conta.setDescricao(dto.getParcelas() > 1 ?
                        dto.getDescricao() + " (" + (i + 1) + "/" + dto.getParcelas() + ")" :
                        dto.getDescricao());

                conta.setValor(valorParcela);
                conta.setDataVencimento(dto.getPrimeiroVencimento().plusMonths(i));
                conta.setStatus(StatusConta.PENDENTE);
                conta.setFornecedor(fornecedor);
                conta.setGrupoId(dto.getParcelas() > 1 ? grupoId : null);

                novasContas.add(conta);
            }
            return repository.saveAll(novasContas);
        }

        public List<ContaAPagar> buscarComFiltros(Long fornecedorId, String mesAno) {
            List<ContaAPagar> contas = repository.buscarComFiltros(fornecedorId, mesAno);
            boolean houveAlteracao = false;
            for (ContaAPagar conta : contas) {
                if (conta.getStatus() == StatusConta.PENDENTE
                        && conta.getDataVencimento() != null
                        && conta.getDataVencimento().isBefore(LocalDate.now())) {
                    conta.setStatus(StatusConta.VENCIDA);
                    houveAlteracao = true;
                }
            }
            return houveAlteracao ? repository.saveAll(contas) : contas;
        }

        @Transactional
        public ContaAPagar atualizar(Long id, ContaAtualizacaoDTO dto) {
            ContaAPagar conta = repository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
            if (conta.getStatus() == StatusConta.PAGA) {
                throw new RuntimeException("Uma conta paga não pode ser alterada.");
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
            ContaAPagar conta = repository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
            if (conta.getStatus() == StatusConta.PAGA) {
                return conta;
            }
            conta.setStatus(StatusConta.PAGA);
            conta.setDataPagamento(LocalDate.now());
            return repository.save(conta);
        }

        @Transactional
        public void excluir(Long id) {
            ContaAPagar conta = repository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Conta não encontrada"));

            if (conta.getStatus() == StatusConta.PAGA) {
                throw new RuntimeException("Não é permitido excluir uma conta já paga.");
            }

            if (conta.getGrupoId() != null) {
                repository.deleteByGrupoId(conta.getGrupoId());
            } else {
                repository.delete(conta);
            }
        }
    }
