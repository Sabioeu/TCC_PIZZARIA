package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.DiningTable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {
    Optional<DiningTable> findByBranchIdAndNumber(Long branchId, Integer number);
    Optional<DiningTable> findByQrToken(String qrToken);
    List<DiningTable> findAllByBranchIdOrderByNumberAsc(Long branchId);
}
