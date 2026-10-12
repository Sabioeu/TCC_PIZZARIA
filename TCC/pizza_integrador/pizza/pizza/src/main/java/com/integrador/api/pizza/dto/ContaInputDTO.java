package com.integrador.api.pizza.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.*;

@Getter
@Setter
public class ContaInputDTO {
    @NotBlank @Size(max = 200) private String descricao;
    @NotNull @DecimalMin("0.01") @Digits(integer = 9, fraction = 2) private BigDecimal valorTotal;
    @NotNull private LocalDate primeiroVencimento;
    @NotNull @Positive private Long fornecedorId;
    @NotNull @Min(1) @Max(120) private Integer parcelas;
}
