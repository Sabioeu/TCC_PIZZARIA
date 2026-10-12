package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.ComponenteFichaTecnica;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComponenteFichaTecnicaRepository extends JpaRepository<ComponenteFichaTecnica, Long> {
    List<ComponenteFichaTecnica> findByProdutoIdOrderByInsumoId(Long produtoId);
    boolean existsByInsumoId(Long insumoId);
    void deleteByProdutoId(Long produtoId);
}
