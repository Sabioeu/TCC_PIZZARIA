package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.TransacaoFinanceira;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransacaoFinanceiraRepository extends JpaRepository<TransacaoFinanceira, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TransacaoFinanceira t WHERE t.id = :id")
    Optional<TransacaoFinanceira> buscarParaAtualizar(Long id);
    List<TransacaoFinanceira> findByTipo(String tipo);
    List<TransacaoFinanceira> findByDataHoraBetween(LocalDateTime start, LocalDateTime end);
    List<TransacaoFinanceira> findByComandaId(Long comandaId);
    List<TransacaoFinanceira> findByPedidoId(Long pedidoId);
}
