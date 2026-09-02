package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "business_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BusinessSettings {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private Long branchId;
    private String tradeName;
    private String document;
    private String phone;
    private String address;
    @Column(precision = 5, scale = 2)
    private BigDecimal serviceFeePercent;
    @Column(precision = 12, scale = 2)
    private BigDecimal minimumDeliveryOrder;
    @Column(precision = 12, scale = 2)
    private BigDecimal defaultDeliveryFee;
    private Integer averagePrepMinutes;
    private Integer maxDeliveryRadiusKm;
    @Builder.Default
    private boolean automaticAcceptance = true;
    @Builder.Default
    private boolean allowNotes = true;
    @Builder.Default
    private boolean printTicket = false;
    @Builder.Default
    private boolean pixEnabled = true;
    @Builder.Default
    private boolean cardEnabled = true;
    @Builder.Default
    private boolean cashEnabled = true;
    private String pixKey;
}
