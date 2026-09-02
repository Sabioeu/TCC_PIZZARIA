package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reservation {
    public enum Status { CONFIRMED, SEATED, COMPLETED, NO_SHOW, CANCELED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    private Long tableId;
    private Integer tableNumber;
    private Long customerId;
    @Column(nullable = false)
    private String customerName;
    private String phone;
    @Column(nullable = false)
    private LocalDateTime reservedFor;
    private Integer partySize;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    private String notes;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
