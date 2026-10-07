package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class TransacaoFinanceiraCadastroDTO {
    @NotNull(message = "O valor da transação é obrigatório") @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero") private Double valor;
    @NotBlank(message = "O tipo da transação é obrigatório") @Size(max = 50, message = "O tipo não pode ter mais de 50 caracteres") private String tipo;
    @Size(max = 500, message = "A descrição não pode ter mais de 500 caracteres") private String descricao;
    private Long comandaId;
    private Long pedidoId;
}