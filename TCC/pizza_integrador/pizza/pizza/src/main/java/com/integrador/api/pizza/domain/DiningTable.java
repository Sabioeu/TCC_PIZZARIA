package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "dining_tables")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiningTable {
    public enum Status { AVAILABLE, OCCUPIED, RESERVED, CLEANING, INACTIVE }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private Integer number;
    @Builder.Default
    private Integer seats = 4;
    private String area;
    @Enumerated(EnumType.STRING) @Builder.Default
    private Status status = Status.AVAILABLE;
}
