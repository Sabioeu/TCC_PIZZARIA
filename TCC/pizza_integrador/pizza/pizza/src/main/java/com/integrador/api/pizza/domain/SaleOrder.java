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
    public enum Status { RECEIVED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, COMPLETED, CANCELED }
    public enum Type { DINE_IN, DELIVERY, PICKUP }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    @Builder.Default
    private Long branchId = 1L;
    @Column(nullable = false, unique = true)
    private String code;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Status status;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Type type;
    private Integer tableNumber;
    private String customerName;
    private Long customerId;
    private String customerPhone;
    private String deliveryAddress;
    private String deliveryDriver;
    private String paymentMethod;
    private String couponCode;
    private String notes;
    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;
    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;
    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;
    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal serviceFee = BigDecimal.ZERO;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;
    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;
    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal changeAmount = BigDecimal.ZERO;
    private LocalDateTime estimatedAt;
    private LocalDateTime startedAt;
    private LocalDateTime readyAt;
    private LocalDateTime completedAt;
    private String createdBy;
    @Builder.Default
    private boolean stockDeducted = false;
    @Builder.Default
    private boolean loyaltyProcessed = false;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "sale_order_lines", joinColumns = @JoinColumn(name = "order_id"))
    @Builder.Default
    private List<OrderLine> items = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "sale_order_payments", joinColumns = @JoinColumn(name = "order_id"))
    @Builder.Default
    private List<OrderPayment> payments = new ArrayList<>();

    @Embeddable
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OrderLine {
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal unitCost;
        private String variantName;
        private Long halfProductId;
        private String halfProductName;
        private String modifiers;
        private String notes;
        private BigDecimal lineTotal;
    }

    @Embeddable
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OrderPayment {
        private String method;
        private BigDecimal amount;
    }
}
