package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "payment_charges")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentCharge {
    public enum Status { PENDING, PAID, EXPIRED, CANCELED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long branchId;
    private Long orderId;
    @Column(nullable = false) private String provider;
    @Column(nullable = false) private String method;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(nullable = false, unique = true) private String externalReference;
    @Column(length = 1000) private String pixCopyPaste;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
