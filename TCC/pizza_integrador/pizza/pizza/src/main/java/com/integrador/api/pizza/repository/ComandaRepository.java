package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Comanda c where c.id = :id")
    Optional<Comanda> buscarParaAtualizar(@Param("id") Long id);

    Optional<Comanda> findByNumero(Integer numero);

    // 🚨 CORREÇÃO DE CONSULTA: Método padrão do Spring Data JPA (Mais seguro contra erros de sintaxe)
    List<Comanda> findByStatus(String status);

    // Método para geração de número
    @Query("SELECT MAX(c.numero) FROM Comanda c")
    Optional<Integer> findMaxNumeroComanda();
}
