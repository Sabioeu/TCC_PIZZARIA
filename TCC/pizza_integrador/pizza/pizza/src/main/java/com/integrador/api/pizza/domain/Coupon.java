package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "coupons", uniqueConstraints = @UniqueConstraint(columnNames = {"branch_id", "code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Coupon {
    public enum Type { PERCENT, FIXED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    @Column(nullable = false)
    private String code;
    private String description;
    @Enumerated(EnumType.STRING)
    private Type type;
    @Column(name = "discount_value", precision = 12, scale = 2)
    private BigDecimal value;
    private LocalDate validUntil;
    @Builder.Default
    private boolean active = true;
}
