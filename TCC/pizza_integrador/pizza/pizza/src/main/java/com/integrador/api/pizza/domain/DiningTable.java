package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "dining_tables", uniqueConstraints = @UniqueConstraint(columnNames = {"branch_id", "table_number"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiningTable {
    public enum Status { AVAILABLE, OCCUPIED, RESERVED, CLEANING, INACTIVE }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    @Builder.Default
    private Long branchId = 1L;
    @Column(name = "table_number", nullable = false)
    private Integer number;
    @Builder.Default
    private Integer seats = 4;
    private String area;
    @Column(unique = true)
    private String qrToken;
    @Enumerated(EnumType.STRING) @Builder.Default
    private Status status = Status.AVAILABLE;
}
