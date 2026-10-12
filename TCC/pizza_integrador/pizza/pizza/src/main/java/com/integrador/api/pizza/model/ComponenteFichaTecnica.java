package com.integrador.api.pizza.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@Table(name = "componentes_ficha_tecnica", uniqueConstraints = @UniqueConstraint(columnNames = {"produto_id", "insumo_id"}))
@Getter @Setter @NoArgsConstructor
public class ComponenteFichaTecnica {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "produto_id", nullable = false) private Produto produto;
    @ManyToOne(optional = false) @JoinColumn(name = "insumo_id", nullable = false) private Insumo insumo;
    @Column(nullable = false, precision = 18, scale = 6) private BigDecimal quantidadePorUnidade;
}
