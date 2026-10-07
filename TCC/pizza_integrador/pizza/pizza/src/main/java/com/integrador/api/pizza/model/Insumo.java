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
@Table(name = "insumos")
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Insumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_insumo", nullable = false, length = 150)
    private String nome;

    @Column(name = "quantidade_insumo", nullable = false)
    private Double quantidade;

    @Column(name = "unidade_insumo", nullable = false, length = 50)
    private String unidade; // Ex: "Kg", "Litros", "unidades"

    // Construtor para uso com DTOs de cadastro (sem o ID, que é gerado)
    public Insumo(String nome, Double quantidade, String unidade) {
        this.nome = nome;
        this.quantidade = quantidade;
        this.unidade = unidade;
    }
}