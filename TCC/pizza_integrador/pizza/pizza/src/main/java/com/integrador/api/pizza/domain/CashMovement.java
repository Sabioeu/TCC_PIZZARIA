package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_movements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashMovement {
    public enum Type { SALE, SUPPLY, WITHDRAWAL, REFUND, ADJUSTMENT }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    @Column(nullable = false)
    private Long cashSessionId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;
    private String description;
    private String paymentMethod;
    private String referenceCode;
    private String performedBy;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
