package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockMovement {
    public enum Type { PURCHASE, SALE, ADJUSTMENT, WASTE, RETURN }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    @Column(nullable = false)
    private Long inventoryItemId;
    private String inventoryItemName;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;
    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal quantity;
    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal balanceAfter;
    private String reason;
    private String referenceCode;
    private String performedBy;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
