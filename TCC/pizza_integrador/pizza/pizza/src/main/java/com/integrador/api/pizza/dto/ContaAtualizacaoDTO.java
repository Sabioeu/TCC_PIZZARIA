package com.integrador.api.pizza.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.validation.constraints.*;

@Getter
@Setter
public class ContaAtualizacaoDTO {
    @NotBlank @Size(max = 200) private String descricao;
    @NotNull @DecimalMin("0.01") @Digits(integer = 9, fraction = 2) private BigDecimal valor;
    @NotNull private LocalDate dataVencimento;
}
