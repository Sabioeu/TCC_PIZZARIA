package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "loyalty_transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyTransaction {
    public enum Type { EARN, REDEEM, ADJUSTMENT }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    @Column(nullable = false)
    private Long customerId;
    @Enumerated(EnumType.STRING)
    private Type type;
    private Integer points;
    private String description;
    private String referenceCode;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
