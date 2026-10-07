package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.TransacaoFinanceira;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransacaoFinanceiraRepository extends JpaRepository<TransacaoFinanceira, Long> {
    List<TransacaoFinanceira> findByTipo(String tipo);
    List<TransacaoFinanceira> findByDataHoraBetween(LocalDateTime start, LocalDateTime end);
    List<TransacaoFinanceira> findByComandaId(Long comandaId);
    List<TransacaoFinanceira> findByPedidoId(Long pedidoId);
}