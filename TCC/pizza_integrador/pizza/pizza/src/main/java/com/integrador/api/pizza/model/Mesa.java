package com.integrador.api.pizza.model;

import com.integrador.api.pizza.enums.StatusMesa;
import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "mesas")
@Data
@Getter
@Setter
public class Mesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer numero;

    @Enumerated(EnumType.STRING)
    private StatusMesa status = StatusMesa.DISPONIVEL;

    @Column(nullable = false)
    private Boolean ativo = true; // Controle manual de ativação/desativação

    private Integer capacidade;

}
