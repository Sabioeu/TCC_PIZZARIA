package com.integrador.api.pizza.model;

import com.integrador.api.pizza.enums.StatusConta;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "contas_a_pagar")
public class ContaAPagar {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String descricao;
    private BigDecimal valor;
    private LocalDate dataVencimento;
    private LocalDate dataPagamento;

    @Enumerated(EnumType.STRING)
    private StatusConta status; // PENDENTE, PAGA, VENCIDA

    @ManyToOne
    @JoinColumn(name = "fornecedor_id")
    private Fornecedor fornecedor;

    private String grupoId; // Para identificar parcelamentos (seu 🔗 no front)

    // Getters e Setters
}
