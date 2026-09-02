package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "purchase_orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseOrder {
    public enum Status { DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    @Column(nullable = false, unique = true)
    private String code;
    private Long supplierId;
    private String supplierName;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    private LocalDate expectedDate;
    private LocalDate receivedDate;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;
    private String notes;
    private String createdBy;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "purchase_order_items", joinColumns = @JoinColumn(name = "purchase_order_id"))
    @Builder.Default
    private List<PurchaseItem> items = new ArrayList<>();

    @Embeddable
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PurchaseItem {
        private Long inventoryItemId;
        private String inventoryItemName;
        private BigDecimal quantity;
        private BigDecimal unitCost;
        private BigDecimal lineTotal;
    }
}
