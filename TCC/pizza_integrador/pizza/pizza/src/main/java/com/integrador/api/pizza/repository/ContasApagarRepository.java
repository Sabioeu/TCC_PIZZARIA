package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.model.ContaAPagar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContasApagarRepository extends JpaRepository<ContaAPagar, Long> {

    // Método para excluir todas as parcelas de um mesmo carnê
    void deleteByGrupoId(String grupoId);

    // Query customizada para o histórico do Frontend
    @Query("SELECT c FROM ContaAPagar c WHERE " +
            "(:fornecedorId IS NULL OR c.fornecedor.id = :fornecedorId) AND " +
            "(:mesAno IS NULL OR TO_CHAR(c.dataVencimento, 'YYYY-MM') = :mesAno)")
    List<ContaAPagar> buscarComFiltros(Long fornecedorId, String mesAno);
}
