package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "recipe_components", uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "inventory_item_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecipeComponent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    @Column(nullable = false)
    private Long productId;
    @Column(nullable = false)
    private Long inventoryItemId;
    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal quantity;
    private String unit;
}
