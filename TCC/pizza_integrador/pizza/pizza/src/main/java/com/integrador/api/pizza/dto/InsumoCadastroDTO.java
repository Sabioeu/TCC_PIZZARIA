package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class InsumoCadastroDTO {
    @NotBlank(message = "O nome do insumo é obrigatório") @Size(max = 150, message = "O nome não pode ter mais de 150 caracteres") private String nome;
    @NotNull(message = "A quantidade é obrigatória") @DecimalMin(value = "0.0", message = "A quantidade não pode ser negativa") private Double quantidade;
    @NotBlank(message = "A unidade de medida é obrigatória") @Size(max = 50, message = "A unidade não pode ter mais de 50 caracteres") private String unidade;
}
