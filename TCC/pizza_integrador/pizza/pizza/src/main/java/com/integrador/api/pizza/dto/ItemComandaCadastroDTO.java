package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ItemComandaCadastroDTO {
    @NotNull(message = "O ID do produto é obrigatório") private Long produtoId;
    @NotNull(message = "A quantidade é obrigatória") @Min(value = 1, message = "A quantidade deve ser de pelo menos 1") private Integer quantidade;
    @NotNull(message = "O preço unitário é obrigatório") @Min(value = 0, message = "O preço unitário não pode ser negativo") private Double precoUnitario;
}