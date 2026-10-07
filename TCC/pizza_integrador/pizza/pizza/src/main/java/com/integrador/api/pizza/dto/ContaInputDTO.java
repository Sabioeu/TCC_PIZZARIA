package com.integrador.api.pizza.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContaInputDTO {
    private String descricao;
    private BigDecimal valorTotal;
    private LocalDate primeiroVencimento;
    private Long fornecedorId;
    private Integer parcelas;
}