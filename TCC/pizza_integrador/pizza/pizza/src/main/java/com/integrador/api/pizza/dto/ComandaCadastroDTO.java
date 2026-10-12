package com.integrador.api.pizza.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter
public class ComandaCadastroDTO {

    // O ID do cliente é obrigatório
    @NotNull(message = "O ID do cliente é obrigatório")
    private Long clienteId;

    // 🚨 CORREÇÃO ESSENCIAL: REMOVIDO @NotNull para permitir que o número seja nulo
    // e, assim, possa ser gerado automaticamente pelo ComandaService.
    @Min(value = 1, message = "O número da comanda deve ser maior que zero")
    private Integer numero; // Agora o campo é opcional

    @NotNull(message = "O ID do usuário é obrigatório")
    private Long usuarioId;

    @NotNull(message = "A lista de itens não pode ser nula")
    @NotEmpty(message = "O pedido deve conter pelo menos um item")
    @Valid
    private List<ItemComandaCadastroDTO> itens;

    private Integer mesaId;
    private com.integrador.api.pizza.enums.TipoAtendimento tipoAtendimento;
    @jakarta.validation.constraints.Size(max=255)
    private String enderecoEntrega;
    @jakarta.validation.constraints.Size(max=20)
    private String telefoneContato;
    @jakarta.validation.constraints.DecimalMin("0.00")
    @jakarta.validation.constraints.Digits(integer=6, fraction=2)
    private java.math.BigDecimal taxaEntrega;
}
