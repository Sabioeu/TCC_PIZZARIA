package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "staff_shifts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffShift {
    public enum Status { OPEN, CLOSED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long branchId;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false) private String employeeName;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(nullable = false) private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    @Column(length = 1000) private String notes;
}
