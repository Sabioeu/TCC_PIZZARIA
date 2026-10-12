package com.integrador.api.pizza.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter
public class FichaTecnicaDTO {
    @NotNull private Boolean porIngredientes;
    @NotNull @Size(max = 100) private List<@NotNull @Valid Componente> componentes;

    @Getter @Setter
    public static class Componente {
        @NotNull @Positive private Long insumoId;
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("999999.999999")
        @Digits(integer = 6, fraction = 6) private BigDecimal quantidadePorUnidade;
    }
}
