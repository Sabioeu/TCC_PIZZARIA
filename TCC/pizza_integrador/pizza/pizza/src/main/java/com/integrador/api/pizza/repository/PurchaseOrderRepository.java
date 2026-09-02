package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> { List<PurchaseOrder> findAllByBranchIdOrderByCreatedAtDesc(Long branchId); }
