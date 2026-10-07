package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ProdutoCadastroDTO {
    @NotBlank(message = "O nome do produto é obrigatório") @Size(max = 150, message = "O nome não pode ter mais de 150 caracteres") private String nome;
    @Size(max = 500, message = "A descrição não pode ter mais de 500 caracteres") private String descricao;
    @NotNull(message = "O preço é obrigatório") @DecimalMin(value = "0.01", message = "O preço deve ser maior que zero") private Double preco;
    private Double quantidade;
}