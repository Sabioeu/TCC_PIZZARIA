package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.model.ContaAPagar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContasApagarRepository extends JpaRepository<ContaAPagar, Long> {

    // Todas as operações bloqueiam o grupo na mesma ordem, evitando exclusão de parcelas pagas.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM ContaAPagar c WHERE c.id = :id OR c.grupoId = " +
            "(SELECT referencia.grupoId FROM ContaAPagar referencia WHERE referencia.id = :id) ORDER BY c.id")
    List<ContaAPagar> buscarGrupoParaAtualizar(Long id);

    // Query customizada para o histórico do Frontend
    @Query("SELECT c FROM ContaAPagar c WHERE " +
            "(:fornecedorId IS NULL OR c.fornecedor.id = :fornecedorId) AND " +
            "(:mesAno IS NULL OR TO_CHAR(c.dataVencimento, 'YYYY-MM') = :mesAno)")
    List<ContaAPagar> buscarComFiltros(Long fornecedorId, String mesAno);
}
