package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    @Builder.Default
    private Long branchId = 1L;
    private String sku;
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
    private Integer prepMinutes = 15;
    @Builder.Default
    private boolean availableForHalf = false;
    @Builder.Default
    private boolean active = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_variants", joinColumns = @JoinColumn(name = "product_id"))
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();

    @Embeddable
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProductVariant {
        @Column(name = "variant_name")
        private String name;
        @Column(name = "price_adjustment", precision = 12, scale = 2)
        private BigDecimal priceAdjustment;
    }
}
