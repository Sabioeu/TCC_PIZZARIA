package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CustomerRepository extends JpaRepository<Customer, Long> { List<Customer> findAllByBranchIdOrderByNameAsc(Long branchId); }
