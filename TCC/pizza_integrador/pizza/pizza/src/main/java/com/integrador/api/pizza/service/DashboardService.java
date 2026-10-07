package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.DashboardResumoDTO;
import com.integrador.api.pizza.enums.StatusConta;
import com.integrador.api.pizza.enums.StatusMesa;
import com.integrador.api.pizza.model.ContaAPagar;
import com.integrador.api.pizza.model.TransacaoFinanceira;
import com.integrador.api.pizza.repository.ClienteRepository;
import com.integrador.api.pizza.repository.ComandaRepository;
import com.integrador.api.pizza.repository.ContasApagarRepository;
import com.integrador.api.pizza.repository.InsumoRepository;
import com.integrador.api.pizza.repository.MesaRepository;
import com.integrador.api.pizza.repository.ProdutoRepository;
import com.integrador.api.pizza.repository.TransacaoFinanceiraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DashboardService {

    private final TransacaoFinanceiraRepository transacaoRepository;
    private final ComandaRepository comandaRepository;
    private final MesaRepository mesaRepository;
    private final ProdutoRepository produtoRepository;
    private final InsumoRepository insumoRepository;
    private final ClienteRepository clienteRepository;
    private final ContasApagarRepository contasRepository;

    public DashboardService(
            TransacaoFinanceiraRepository transacaoRepository,
            ComandaRepository comandaRepository,
            MesaRepository mesaRepository,
            ProdutoRepository produtoRepository,
            InsumoRepository insumoRepository,
            ClienteRepository clienteRepository,
            ContasApagarRepository contasRepository
    ) {
        this.transacaoRepository = transacaoRepository;
        this.comandaRepository = comandaRepository;
        this.mesaRepository = mesaRepository;
        this.produtoRepository = produtoRepository;
        this.insumoRepository = insumoRepository;
        this.clienteRepository = clienteRepository;
        this.contasRepository = contasRepository;
    }

    @Transactional(readOnly = true)
    public DashboardResumoDTO obterResumo() {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioMes = hoje.withDayOfMonth(1);
        LocalDate inicioSemana = hoje.minusDays(6);

        List<TransacaoFinanceira> transacoesMes = transacaoRepository.findByDataHoraBetween(
                inicioMes.atStartOfDay(), hoje.atTime(LocalTime.MAX));
        List<TransacaoFinanceira> transacoesSemana = transacaoRepository.findByDataHoraBetween(
                inicioSemana.atStartOfDay(), hoje.atTime(LocalTime.MAX));

        BigDecimal faturamentoHoje = somarTransacoes(transacoesMes.stream()
                .filter(t -> t.getDataHora() != null && t.getDataHora().toLocalDate().equals(hoje))
                .toList());
        BigDecimal faturamentoMes = somarTransacoes(transacoesMes);
        BigDecimal ticketMedio = transacoesMes.isEmpty()
                ? BigDecimal.ZERO
                : faturamentoMes.divide(BigDecimal.valueOf(transacoesMes.size()), 2, RoundingMode.HALF_UP);

        List<DashboardResumoDTO.FaturamentoDiaDTO> faturamentoSemanal = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate data = inicioSemana.plusDays(i);
            BigDecimal valor = somarTransacoes(transacoesSemana.stream()
                    .filter(t -> t.getDataHora() != null && t.getDataHora().toLocalDate().equals(data))
                    .toList());
            String rotulo = data.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("pt-BR"));
            faturamentoSemanal.add(new DashboardResumoDTO.FaturamentoDiaDTO(data.toString(), rotulo, valor));
        }

        Map<String, List<TransacaoFinanceira>> porPagamento = new LinkedHashMap<>();
        transacoesMes.stream()
                .sorted(Comparator.comparing(TransacaoFinanceira::getTipo, Comparator.nullsLast(String::compareTo)))
                .forEach(t -> porPagamento.computeIfAbsent(normalizarTipo(t.getTipo()), key -> new ArrayList<>()).add(t));

        List<DashboardResumoDTO.MeioPagamentoDTO> meiosPagamento = porPagamento.entrySet().stream()
                .map(entry -> new DashboardResumoDTO.MeioPagamentoDTO(
                        entry.getKey(), somarTransacoes(entry.getValue()), entry.getValue().size()))
                .sorted(Comparator.comparing(DashboardResumoDTO.MeioPagamentoDTO::valor).reversed())
                .toList();

        List<DashboardResumoDTO.AtividadeRecenteDTO> atividades = transacaoRepository.findAll().stream()
                .filter(t -> t.getDataHora() != null)
                .sorted(Comparator.comparing(TransacaoFinanceira::getDataHora).reversed())
                .limit(5)
                .map(t -> new DashboardResumoDTO.AtividadeRecenteDTO(
                        t.getId(),
                        normalizarTipo(t.getTipo()),
                        t.getDescricao() == null || t.getDescricao().isBlank() ? "Recebimento registrado" : t.getDescricao(),
                        decimal(t.getValor()),
                        t.getDataHora()))
                .toList();

        List<ContaAPagar> contas = contasRepository.findAll();
        BigDecimal contasPendentes = contas.stream()
                .filter(c -> c.getStatus() != StatusConta.PAGA)
                .map(ContaAPagar::getValor)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal contasVencidas = contas.stream()
                .filter(c -> c.getStatus() != StatusConta.PAGA)
                .filter(c -> c.getDataVencimento() != null && c.getDataVencimento().isBefore(hoje))
                .map(ContaAPagar::getValor)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long estoqueBaixo = produtoRepository.findAll().stream()
                .filter(p -> p.getQuantidade() == null || p.getQuantidade() <= 5)
                .count();
        estoqueBaixo += insumoRepository.findAll().stream()
                .filter(i -> i.getQuantidade() == null || i.getQuantidade() <= 5)
                .count();

        long mesasDisponiveis = mesaRepository.findAll().stream()
                .filter(m -> Boolean.TRUE.equals(m.getAtivo()) && m.getStatus() == StatusMesa.DISPONIVEL)
                .count();
        long mesasOcupadas = mesaRepository.findAll().stream()
                .filter(m -> Boolean.TRUE.equals(m.getAtivo()) && m.getStatus() == StatusMesa.OCUPADA)
                .count();

        return new DashboardResumoDTO(
                faturamentoHoje,
                faturamentoMes,
                comandaRepository.findByStatus("ABERTA").size(),
                ticketMedio,
                mesasDisponiveis,
                mesasOcupadas,
                produtoRepository.count(),
                clienteRepository.count(),
                estoqueBaixo,
                contasPendentes,
                contasVencidas,
                faturamentoSemanal,
                meiosPagamento,
                atividades
        );
    }

    private BigDecimal somarTransacoes(List<TransacaoFinanceira> transacoes) {
        return transacoes.stream()
                .map(TransacaoFinanceira::getValor)
                .filter(v -> v != null)
                .map(this::decimal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal decimal(Double valor) {
        return valor == null ? BigDecimal.ZERO : BigDecimal.valueOf(valor).setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizarTipo(String tipo) {
        return tipo == null || tipo.isBlank() ? "OUTROS" : tipo.toUpperCase(Locale.ROOT);
    }
}
