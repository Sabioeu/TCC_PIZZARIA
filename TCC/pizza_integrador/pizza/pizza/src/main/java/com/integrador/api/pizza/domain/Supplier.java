package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "suppliers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Supplier {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long branchId;
    @Column(nullable = false)
    private String name;
    private String document;
    private String contactName;
    private String phone;
    private String email;
    private Integer leadTimeDays;
    @Builder.Default
    private boolean active = true;
}
