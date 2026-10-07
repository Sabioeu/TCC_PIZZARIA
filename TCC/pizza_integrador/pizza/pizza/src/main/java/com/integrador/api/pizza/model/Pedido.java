package com.integrador.api.pizza.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pedidos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "data_hora_pedido", nullable = false)
    private LocalDateTime dataHora;

    @Column(name = "tipo_pedido", nullable = false, length = 50)
    private String tipo; // Ex: "ONLINE", "PRESENCIAL", "DELIVERY"

    @Column(name = "status_pedido", nullable = false, length = 50)
    private String status; // Ex: "PENDENTE", "EM PREPARACAO", "PRONTO", "ENTREGUE", "CANCELADO"

    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "comanda_id") // Comanda é opcional, pode ser null
    private Comanda comanda;

    // ADICIONE ESTE BLOCO:
    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ItemPedido> itens = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "mesa_id")
    private Mesa mesa;

    // Construtor para uso com DTO de cadastro (sem ID)
    public Pedido(LocalDateTime dataHora, String tipo, String status, Cliente cliente, Usuario usuario, Comanda comanda) {
        this.dataHora = dataHora;
        this.tipo = tipo;
        this.status = status;
        this.cliente = cliente;
        this.usuario = usuario;
        this.comanda = comanda;
    }
}