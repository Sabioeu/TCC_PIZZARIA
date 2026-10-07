package com.integrador.api.pizza.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimentos_estoque")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class MovimentoEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "data_hora_movimento", nullable = false)
    private LocalDateTime dataHora;

    @Column(name = "tipo_movimento", nullable = false, length = 50)
    private String tipo; // "ENTRADA", "SAIDA"

    @Column(name = "quantidade_movimento", nullable = false)
    private double quantidade;

    // Nulos nos registros antigos: preserva o histórico sem tentar inferir sua origem.
    @Column(length = 30)
    private String origem;
    private Long referencia;

    @ManyToOne
    @JoinColumn(name = "produto_id") // Pode ser nulo se for um insumo
    private Produto produto;

    @ManyToOne
    @JoinColumn(name = "insumo_id") // Pode ser nulo se for um produto
    private Insumo insumo;

    // Construtor para uso com DTO de cadastro (sem ID)
    public MovimentoEstoque(LocalDateTime dataHora, String tipo, double quantidade, Produto produto, Insumo insumo) {
        this.dataHora = dataHora;
        this.tipo = tipo;
        this.quantidade = quantidade;
        this.produto = produto;
        this.insumo = insumo;
    }
}
