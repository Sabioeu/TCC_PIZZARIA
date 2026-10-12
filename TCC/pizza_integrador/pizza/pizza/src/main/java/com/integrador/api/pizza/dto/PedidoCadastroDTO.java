package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter
public class PedidoCadastroDTO {
    @NotNull(message = "O ID do cliente é obrigatório") private Long clienteId;
    @NotNull(message = "O ID do usuário é obrigatório") private Long usuarioId;
    private Long comandaId;

    private Long mesaId;

    @NotBlank @Size(max = 50) private String tipo;

    // 🚨 CAMPO CRÍTICO: Lista de Itens
    // O Serviço tenta usar getItens()
    @Valid @NotEmpty(message = "Adicione pelo menos um item")
    private List<ItemPedidoDTO> itens;
}
