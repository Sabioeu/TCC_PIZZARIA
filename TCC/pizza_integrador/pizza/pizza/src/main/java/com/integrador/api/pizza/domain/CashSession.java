package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashSession {
    public enum Status { OPEN, CLOSED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal openingAmount;
    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal expectedAmount = BigDecimal.ZERO;
    @Column(precision = 12, scale = 2)
    private BigDecimal countedAmount;
    @Column(precision = 12, scale = 2)
    private BigDecimal differenceAmount;
    private String openedBy;
    private String closedBy;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private String notes;
}
