package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.CashSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface CashSessionRepository extends JpaRepository<CashSession, Long> {
    Optional<CashSession> findFirstByBranchIdAndStatusOrderByOpenedAtDesc(Long branchId, CashSession.Status status);
    List<CashSession> findTop20ByBranchIdOrderByOpenedAtDesc(Long branchId);
}
