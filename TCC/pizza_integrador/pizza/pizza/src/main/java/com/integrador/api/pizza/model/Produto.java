package com.integrador.api.pizza.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

@Setter
@Getter
@Entity
@Table(name = "produtos")
@NoArgsConstructor
@AllArgsConstructor // Este construtor vai ter Long id, String nome, String descricao, Double preco
@EqualsAndHashCode(of = "id")
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_produto", nullable = false, length = 150)
    private String nome;

    @Column(name = "descricao_produto", length = 500)
    private String descricao;

    @Column(name = "preco_produto", nullable = false)
    private Double preco;

    @Column(name = "quantidade_produto")
    private Double quantidade;

    // Nulo nos registros antigos: o controle por unidades permanece como antes.
    @Column(name = "estoque_por_ingredientes")
    private Boolean porIngredientes = false;

    public Boolean getPorIngredientes() { return Boolean.TRUE.equals(porIngredientes); }

    // ADICIONE ESTE CONSTRUTOR ABAIXO para resolver o problema no ProdutoService:
    // Construtor sem ID (útil para criar novos produtos a partir do DTO)
    public Produto(String nome, String descricao, Double preco) {
        this.nome = nome;
        this.descricao = descricao;
        this.preco = preco;
    }
}
