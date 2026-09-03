package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.SaleOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long> {
    List<SaleOrder> findAllByOrderByCreatedAtDesc();
    List<SaleOrder> findAllByBranchIdOrderByCreatedAtDesc(Long branchId);
    Optional<SaleOrder> findByCodeIgnoreCase(String code);
    List<SaleOrder> findAllByBranchIdAndCustomerIdOrderByCreatedAtDesc(Long branchId, Long customerId);
}
