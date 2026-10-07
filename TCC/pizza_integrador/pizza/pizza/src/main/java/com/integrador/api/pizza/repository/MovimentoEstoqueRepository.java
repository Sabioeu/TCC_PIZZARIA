package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.MovimentoEstoque;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimentoEstoqueRepository extends JpaRepository<MovimentoEstoque, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from MovimentoEstoque m where m.id = :id")
    java.util.Optional<MovimentoEstoque> buscarParaAtualizar(@org.springframework.data.repository.query.Param("id") Long id);
    List<MovimentoEstoque> findByTipo(String tipo);
    List<MovimentoEstoque> findByDataHoraBetween(LocalDateTime start, LocalDateTime end);
    List<MovimentoEstoque> findByProdutoId(Long produtoId);
    List<MovimentoEstoque> findByInsumoId(Long insumoId);
}
