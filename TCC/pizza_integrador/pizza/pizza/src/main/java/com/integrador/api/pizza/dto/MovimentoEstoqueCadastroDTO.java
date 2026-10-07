package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class MovimentoEstoqueCadastroDTO {
    @NotBlank(message = "O tipo de movimento é obrigatório") @Size(max = 50, message = "O tipo não pode ter mais de 50 caracteres") private String tipo;
    @NotNull(message = "A quantidade é obrigatória") @DecimalMin(value = "0.01", message = "A quantidade deve ser maior que zero") private Double quantidade;
    private Long produtoId;
    private Long insumoId;
}