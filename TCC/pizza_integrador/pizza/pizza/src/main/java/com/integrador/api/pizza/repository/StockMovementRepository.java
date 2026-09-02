package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> { List<StockMovement> findTop100ByBranchIdOrderByCreatedAtDesc(Long branchId); }
