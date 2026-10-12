package com.integrador.api.pizza.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Linha de coordenação: o lock pertence ao banco, não a uma JVM. */
@Entity @Table(name="controle_numeracao_comanda") @Getter @NoArgsConstructor
public class ControleNumeracaoComanda {
    @Id private Integer id;
    public ControleNumeracaoComanda(Integer id) { this.id=id; }
}
