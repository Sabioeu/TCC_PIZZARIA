package com.integrador.api.pizza.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;

/** Receita capturada no lançamento; reserva e baixa usam este snapshot. */
@Entity @Table(name = "consumos_itens_comanda")
@Getter @Setter @NoArgsConstructor
public class ConsumoItemComanda {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "item_comanda_id", nullable = false) private ItemComanda item;
    @ManyToOne(optional = false) @JoinColumn(name = "insumo_id", nullable = false) private Insumo insumo;
    @Column(nullable = false, precision = 18, scale = 6) private BigDecimal quantidadePorUnidade;
    @Column(nullable = false, length = 150) private String nomeInsumo;
    @Column(nullable = false, length = 50) private String unidadeInsumo;
}
