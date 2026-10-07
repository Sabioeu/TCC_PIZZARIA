package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class ItemPedidoDTO {

    @NotNull(message = "O ID do produto é obrigatório")
    private Long produtoId;

    @NotNull(message = "A quantidade é obrigatória")
    private Integer quantidade;

    @NotNull(message = "O preço unitário é obrigatório")
    private BigDecimal precoUnitario;

    // 🚨 GETTERS ADICIONADOS MANUALMENTE PARA RESOLVER O ERRO DE COMPILAÇÃO

    public Long getProdutoId() {
        return produtoId;
    }

    public void setProdutoId(Long produtoId) {
        this.produtoId = produtoId;
    }

    public Integer getQuantidade() {
        return quantidade;
    }

    public void setQuantidade(Integer quantidade) {
        this.quantidade = quantidade;
    }

    public BigDecimal getPrecoUnitario() {
        return precoUnitario;
    }

    public void setPrecoUnitario(BigDecimal precoUnitario) {
        this.precoUnitario = precoUnitario;
    }
}