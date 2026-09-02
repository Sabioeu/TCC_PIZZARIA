package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Column(nullable = false)
    private String name;
    @NotBlank @Column(nullable = false)
    private String category;
    private String description;
    @PositiveOrZero @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;
    @PositiveOrZero @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal cost;
    private String accent;
    @Builder.Default
    private boolean active = true;
}
