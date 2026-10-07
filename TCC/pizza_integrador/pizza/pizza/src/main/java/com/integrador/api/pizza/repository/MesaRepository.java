package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.Mesa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MesaRepository extends JpaRepository<Mesa, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from Mesa m where m.id = :id")
    java.util.Optional<Mesa> buscarParaAtualizar(@org.springframework.data.repository.query.Param("id") Long id);
    // Busca apenas as mesas que o usuário deixou "Ativadas"
    List<Mesa> findByAtivoTrue();

    // Busca por número da mesa (útil para validações)
    Mesa findByNumero(Integer numero);
}
