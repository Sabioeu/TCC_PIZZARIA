package com.integrador.api.pizza.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record DashboardResumoDTO(
        BigDecimal faturamentoHoje,
        BigDecimal faturamentoMes,
        long comandasAbertas,
        BigDecimal ticketMedioMes,
        long mesasDisponiveis,
        long mesasOcupadas,
        long produtosCadastrados,
        long clientesCadastrados,
        long itensEstoqueBaixo,
        BigDecimal contasPendentes,
        BigDecimal contasVencidas,
        List<FaturamentoDiaDTO> faturamentoSemanal,
        List<MeioPagamentoDTO> meiosPagamento,
        List<AtividadeRecenteDTO> atividadesRecentes
) {
    public record FaturamentoDiaDTO(String data, String rotulo, BigDecimal valor) {}

    public record MeioPagamentoDTO(String tipo, BigDecimal valor, long quantidade) {}

    public record AtividadeRecenteDTO(
            Long id,
            String tipo,
            String descricao,
            BigDecimal valor,
            LocalDateTime dataHora
    ) {}
}
