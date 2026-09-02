package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.LoyaltyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, Long> { List<LoyaltyTransaction> findTop100ByBranchIdOrderByCreatedAtDesc(Long branchId); }
