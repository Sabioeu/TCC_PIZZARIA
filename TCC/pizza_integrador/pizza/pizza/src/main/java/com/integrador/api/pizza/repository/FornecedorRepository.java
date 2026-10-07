package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.Fornecedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FornecedorRepository extends JpaRepository<Fornecedor, Long> {
    List<Fornecedor> findByAtivoTrue();
    // O JPA já fornece findById, save, findAll e delete por padrão
}