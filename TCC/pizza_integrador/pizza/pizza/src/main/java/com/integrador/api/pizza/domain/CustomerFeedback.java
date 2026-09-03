package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_feedback")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerFeedback {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long branchId;
    @Column(nullable = false, unique = true) private Long orderId;
    @Column(nullable = false) private String orderCode;
    private String customerName;
    @Column(nullable = false) private Integer rating;
    @Column(length = 1500) private String comment;
    @Builder.Default @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
}
