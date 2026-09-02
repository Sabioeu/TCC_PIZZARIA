package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    private String actor;
    @Column(nullable = false)
    private String action;
    @Column(nullable = false)
    private String entityType;
    private String entityId;
    @Column(length = 2000)
    private String details;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
