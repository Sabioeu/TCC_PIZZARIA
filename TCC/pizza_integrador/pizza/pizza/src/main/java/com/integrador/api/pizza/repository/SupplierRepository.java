package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SupplierRepository extends JpaRepository<Supplier, Long> { List<Supplier> findAllByBranchIdOrderByNameAsc(Long branchId); }
