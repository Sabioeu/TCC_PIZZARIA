package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Produto p where p.id = :id")
    java.util.Optional<Produto> buscarParaAtualizar(@org.springframework.data.repository.query.Param("id") Long id);
    // Optional<Produto> findByNomeContainingIgnoreCase(String nome);
}
