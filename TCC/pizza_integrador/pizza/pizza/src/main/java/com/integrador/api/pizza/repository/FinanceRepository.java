package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.FinanceEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface FinanceRepository extends JpaRepository<FinanceEntry, Long> {
    List<FinanceEntry> findAllByBranchIdOrderByDueDateDesc(Long branchId);
    boolean existsByReferenceCode(String referenceCode);
}
