package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "customers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Column(nullable = false)
    private String name;
    private String phone;
    private String email;
    private String address;
    @Builder.Default
    private int ordersCount = 0;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
