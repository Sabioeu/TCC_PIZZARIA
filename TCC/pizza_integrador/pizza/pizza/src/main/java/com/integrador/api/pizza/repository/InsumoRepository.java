package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.Insumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InsumoRepository extends JpaRepository<Insumo, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from Insumo i where i.id = :id")
    java.util.Optional<Insumo> buscarParaAtualizar(@org.springframework.data.repository.query.Param("id") Long id);
    // Optional<Insumo> findByNomeContainingIgnoreCase(String nome);
}
