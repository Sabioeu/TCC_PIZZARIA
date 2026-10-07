package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.ItemComanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemComandaRepository extends JpaRepository<ItemComanda, Long> {
    // Exemplo: buscar todos os itens de uma comanda específica
    List<ItemComanda> findByComandaId(Long comandaId);
}