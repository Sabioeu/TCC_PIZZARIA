package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.SaleOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long> {
    List<SaleOrder> findAllByOrderByCreatedAtDesc();
    List<SaleOrder> findAllByBranchIdOrderByCreatedAtDesc(Long branchId);
}
