package com.integrador.api.pizza.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "itens_comanda")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class ItemComanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quantidade", nullable = false)
    private Integer quantidade;

    @Column(name = "preco_unitario", nullable = false)
    private Double precoUnitario;

    @Column(name = "subtotal", nullable = false)
    private Double subtotal; // Será calculado no service

    @ManyToOne
    @JoinColumn(name = "comanda_id", nullable = false)
    private Comanda comanda;

    @ManyToOne
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    // Snapshot: a venda antiga não muda quando a ficha técnica for revisada.
    @Column(name = "estoque_por_ingredientes")
    private Boolean porIngredientes;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ConsumoItemComanda> ingredientes = new java.util.ArrayList<>();

    // Construtor para uso com DTO de cadastro de item (sem o ID e subtotal, que é calculado)
    public ItemComanda(Integer quantidade, Double precoUnitario, Comanda comanda, Produto produto) {
        this.quantidade = quantidade;
        this.precoUnitario = precoUnitario;
        this.comanda = comanda;
        this.produto = produto;
        // O subtotal será calculado no service antes de persistir
        this.subtotal = quantidade * precoUnitario; // Pode ser definido aqui também, ou no service
    }
}
