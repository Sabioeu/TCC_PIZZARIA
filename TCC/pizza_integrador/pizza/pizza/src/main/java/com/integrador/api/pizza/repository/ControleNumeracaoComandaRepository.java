package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.ControleNumeracaoComanda;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface ControleNumeracaoComandaRepository extends JpaRepository<ControleNumeracaoComanda,Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from ControleNumeracaoComanda n where n.id=1")
    Optional<ControleNumeracaoComanda> bloquear();
}
