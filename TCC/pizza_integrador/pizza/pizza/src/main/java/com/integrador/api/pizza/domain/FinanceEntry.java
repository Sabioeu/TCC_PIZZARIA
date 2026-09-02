package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "finance_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FinanceEntry {
    public enum Type { INCOME, EXPENSE }
    public enum Status { PAID, PENDING, OVERDUE }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String description;
    private String category;
    @Enumerated(EnumType.STRING)
    private Type type;
    @Enumerated(EnumType.STRING)
    private Status status;
    @Column(precision = 12, scale = 2)
    private BigDecimal amount;
    private LocalDate dueDate;
}
