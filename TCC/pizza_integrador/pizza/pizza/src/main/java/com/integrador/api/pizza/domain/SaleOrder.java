package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sale_orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SaleOrder {
    public enum Status { RECEIVED, PREPARING, READY, OUT_FOR_DELIVERY, COMPLETED, CANCELED }
    public enum Type { DINE_IN, DELIVERY, PICKUP }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String code;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Status status;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Type type;
    private Integer tableNumber;
    private String customerName;
    private String paymentMethod;
    private String notes;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "sale_order_lines", joinColumns = @JoinColumn(name = "order_id"))
    @Builder.Default
    private List<OrderLine> items = new ArrayList<>();

    @Embeddable
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OrderLine {
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
    }
}
