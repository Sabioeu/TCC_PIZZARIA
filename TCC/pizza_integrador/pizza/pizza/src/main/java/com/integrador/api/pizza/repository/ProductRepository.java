package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProductRepository extends JpaRepository<Product, Long> { List<Product> findAllByBranchIdOrderByCategoryAscNameAsc(Long branchId); }
