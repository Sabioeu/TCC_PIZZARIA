package com.integrador.api.pizza.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "comandas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Comanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_comanda", nullable = false) // Removi o unique=true caso queira reutilizar números de comanda após fechadas
    private Integer numero;

    @Column(name = "data_hora_abertura", nullable = false)
    private LocalDateTime dataHoraAbertura;

    @Column(name = "data_hora_fechamento")
    private LocalDateTime dataHoraFechamento;

    @Column(name = "status_comanda", nullable = false, length = 50)
    private String status;

    @Column(name = "total_comanda", nullable = false)
    private Double total;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    // --- NOVO CAMPO: Vínculo com a Mesa ---
    @ManyToOne
    @JoinColumn(name = "mesa_id")
    private Mesa mesa;

    @JsonIgnore
    @OneToMany(mappedBy = "comanda", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ItemComanda> itens;

    // Construtor atualizado incluindo a mesa
    public Comanda(Integer numero, LocalDateTime dataHoraAbertura, String status, Double total, Usuario usuario, Cliente cliente, Mesa mesa) {
        this.numero = numero;
        this.dataHoraAbertura = dataHoraAbertura;
        this.status = status;
        this.total = total;
        this.usuario = usuario;
        this.cliente = cliente;
        this.mesa = mesa;
    }
}
