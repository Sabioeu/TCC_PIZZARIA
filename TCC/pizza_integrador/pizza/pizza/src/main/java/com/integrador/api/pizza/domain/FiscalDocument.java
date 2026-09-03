package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "fiscal_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FiscalDocument {
    public enum Status { DRAFT, PENDING_CONFIGURATION, AUTHORIZED, REJECTED, CANCELED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long branchId;
    @Column(nullable = false) private Long orderId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(nullable = false) private String documentType;
    private String provider; private String accessKey;
    @Column(length = 1000) private String message;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime issuedAt;
}
