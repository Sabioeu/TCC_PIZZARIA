package com.integrador.api.pizza.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
@Entity
@Table(name = "transacoes_financeiras")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class TransacaoFinanceira {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "data_hora_transacao", nullable = false)
    private LocalDateTime dataHora;

    @Column(name = "tipo_transacao", nullable = false, length = 50)
    private String tipo; // Ex: "CREDITO", "DEBITO", "PIX", "DINHEIRO"

    @Column(name = "valor_transacao", nullable = false)
    private Double valor;

    @Column(name = "descricao_transacao", length = 500)
    private String descricao;

    @ManyToOne
    @JoinColumn(name = "comanda_id")// Pode ser nulo se a transação não for de uma comanda
    @JsonIgnoreProperties({"transacoes", "itens"})
    private Comanda comanda;

    @ManyToOne
    @JoinColumn(name = "pedido_id") // Pode ser nulo se a transação não for de um pedido
    @JsonIgnoreProperties({"transacoes", "itens"})
    private Pedido pedido;

    // Construtor para uso com DTO de cadastro (sem ID)
    public TransacaoFinanceira(LocalDateTime dataHora, String tipo, Double valor, String descricao, Comanda comanda, Pedido pedido) {
        this.dataHora = dataHora;
        this.tipo = tipo;
        this.valor = valor;
        this.descricao = descricao;
        this.comanda = comanda;
        this.pedido = pedido;
    }
}