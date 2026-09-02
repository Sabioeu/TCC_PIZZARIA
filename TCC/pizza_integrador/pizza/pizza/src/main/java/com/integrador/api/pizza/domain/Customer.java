package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity
@Table(name = "customers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    @Builder.Default
    private Long branchId = 1L;
    @NotBlank @Column(nullable = false)
    private String name;
    private String phone;
    private String email;
    private String address;
    private LocalDate birthday;
    @Builder.Default
    private Integer loyaltyPoints = 0;
    @Builder.Default
    @Column(precision = 12, scale = 2)
    private BigDecimal totalSpent = BigDecimal.ZERO;
    private LocalDateTime lastOrderAt;
    @Builder.Default
    private boolean marketingOptIn = true;
    @Builder.Default
    private int ordersCount = 0;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
