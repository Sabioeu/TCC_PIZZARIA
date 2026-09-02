package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "inventory_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    private String unit;
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal minimumQuantity;
    private String supplier;
    private LocalDate expiresAt;
}
