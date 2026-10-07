package com.integrador.api.pizza.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class ContaAtualizacaoDTO {
    private String descricao;
    private BigDecimal valor;
    private LocalDate dataVencimento;
}
