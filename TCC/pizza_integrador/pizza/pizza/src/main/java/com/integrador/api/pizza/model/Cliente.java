package com.integrador.api.pizza.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor; // Este gera o construtor com TODOS os campos, incluindo o ID
import lombok.Getter;
import lombok.NoArgsConstructor; // Este gera o construtor sem argumentos
import lombok.Setter;
import lombok.EqualsAndHashCode;

@Setter
@Getter
@Entity
@Table(name = "clientes")
@NoArgsConstructor
@AllArgsConstructor // Este construtor vai ter Long id, String nome, String cpf, String rg, String endereco, String telefone
@EqualsAndHashCode(of = "id")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_cliente", nullable = false, length = 100)
    private String nome;

    @Column(name = "cpf_cliente", unique = true, length = 14)
    private String cpf;

    @Column(name = "endereco_cliente", length = 255)
    private String endereco;

    @Column(name = "telefone_cliente", length = 20)
    private String telefone;

    // ADICIONE ESTE CONSTRUTOR ABAIXO para resolver o problema:
    // Construtor sem ID (útil para criar novos clientes a partir do DTO)
    public Cliente(String nome, String cpf, String rg, String endereco, String telefone) {
        this.nome = nome;
        this.cpf = cpf;
        this.endereco = endereco;
        this.telefone = telefone;
    }
}